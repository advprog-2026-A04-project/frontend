from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from verifier.sanity import extract_origin, verify_backend_health, verify_cors, verify_frontend_reachable
from verifier.utils import normalize_code, parse_currency, round_up_to_step
from verifier.verdicts import FAILED, VERIFIED


def browser_token(driver) -> str:
    token = driver.execute_script("return window.localStorage.getItem('json.sessionToken');")
    if not token:
        raise AssertionError("No browser session token found in localStorage.")
    return token


def browser_user(driver) -> dict | None:
    return driver.execute_script(
        "const raw = window.localStorage.getItem('json.sessionUser'); return raw ? JSON.parse(raw) : null;"
    )


def ui_login(pages, email: str, password: str, scenario_artifacts, prefix: str) -> dict:
    pages.login.load()
    scenario_artifacts.save_screenshot(f"{prefix}_login.png", pages.driver)
    pages.login.login(email, password)
    pages.login.wait_for_success()
    scenario_artifacts.save_screenshot(f"{prefix}_logged_in.png", pages.driver)
    return {
        "token": browser_token(pages.driver),
        "profile": browser_user(pages.driver),
    }


def ui_logout_if_needed(pages) -> None:
    pages.home.load()
    token = pages.driver.execute_script("return window.localStorage.getItem('json.sessionToken');")
    if token:
        pages.home.logout()
        pages.home.wait_for_text("Create account")


def build_paid_order(settings, services, setup_helper, scenario_artifacts, prefix: str, preferred_jastiper_id: int):
    buyer = setup_helper.register_user_api(
        setup_helper.new_user(prefix),
        evidence=scenario_artifacts,
        evidence_name=f"{prefix}_register",
    )
    product = setup_helper.choose_product(
        buyer.token,
        preferred_jastiper_id=preferred_jastiper_id,
        evidence=scenario_artifacts,
        evidence_name=f"{prefix}_product",
    )
    voucher = setup_helper.ensure_voucher(
        product.price,
        evidence=scenario_artifacts,
        evidence_name=f"{prefix}_voucher",
        force_create=bool(settings.voucher_admin_token),
    )
    expected = setup_helper.expected_total(product.price, voucher, evidence=scenario_artifacts)
    target_balance = expected["total_paid"] + Decimal("50000")
    setup_helper.top_up_to_balance(buyer, target_balance, evidence=scenario_artifacts, prefix=f"{prefix}_topup")
    checkout_response = services.order.checkout(
        buyer.token,
        setup_helper.checkout_body(product.product_id, 1, voucher.code),
        evidence=scenario_artifacts,
        evidence_name=f"{prefix}_checkout",
    )
    assert checkout_response.status_code == 201, f"Checkout did not succeed: {checkout_response.text}"
    order_payload = checkout_response.payload["data"]
    return buyer, product, voucher, expected, order_payload


def transactions_for_order(transactions: list[dict], order_id: int, txn_type: str | None = None) -> list[dict]:
    matched = [item for item in transactions if int(item.get("refId") or -1) == order_id]
    if txn_type:
        matched = [item for item in matched if str(item.get("type")) == txn_type]
    return matched


@pytest.mark.live
def test_health_and_environment_sanity(settings, artifact_manager, scenario_artifacts):
    scenario = "health_and_environment_sanity"
    details = {"frontend_url_tested": settings.frontend_base_url}

    try:
        frontend = verify_frontend_reachable(settings.frontend_base_url)
        frontend_origin = extract_origin(settings.frontend_base_url)
        backends = {
            "auth": settings.auth_base_url,
            "inventory": settings.inventory_base_url,
            "wallet": settings.wallet_base_url,
            "order": settings.order_base_url,
            "voucher": settings.voucher_base_url,
        }

        backend_health = {}
        cors_results = {}
        for name, base_url in backends.items():
            backend_health[name] = verify_backend_health(base_url)
            cors_results[name] = verify_cors(base_url, frontend_origin)

        scenario_artifacts.write_json("frontend.json", frontend)
        scenario_artifacts.write_json("backend_health.json", backend_health)
        scenario_artifacts.write_json("cors.json", cors_results)

        details.update(
            {
                "frontend": frontend,
                "backend_health": backend_health,
                "cors": cors_results,
            }
        )
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise


@pytest.mark.live
def test_login_catalog_with_configured_buyer(
    settings,
    services,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "login_catalog_with_configured_buyer"
    details = {}

    try:
        session = ui_login(
            pages,
            settings.buyer_email,
            settings.buyer_password,
            scenario_artifacts,
            "buyer",
        )
        token = session["token"]

        card_count = pages.catalog.card_count()
        assert card_count > 0, "Catalog did not render any product cards."
        scenario_artifacts.save_screenshot("buyer_catalog.png", pages.driver)

        pages.catalog.open_first_product()
        pages.product_detail.wait_loaded()
        scenario_artifacts.save_screenshot("buyer_product_detail.png", pages.driver)

        product_id = pages.product_detail.product_id()
        product = services.inventory.get_product(
            token,
            product_id,
            evidence=scenario_artifacts,
            evidence_name="catalog_product_detail",
        ).payload

        assert pages.product_detail.product_name() == product["name"]
        assert product_id == product["id"]
        assert parse_currency(pages.product_detail.price_text()) == Decimal(str(product["price"]))
        assert settings.buyer_email in pages.catalog.user_chip_text()

        details.update(
            {
                "buyer_profile": session["profile"],
                "catalog_card_count": card_count,
                "product_id": product["id"],
            }
        )
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        scenario_artifacts.save_screenshot("failure.png", pages.driver)
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise


@pytest.mark.live
def test_checkout_wallet_history_and_order_views(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "checkout_wallet_history_and_order_views"
    details = {}

    try:
        buyer = setup_helper.new_user("ui-checkout")
        setup_helper.register_user_api(
            buyer,
            evidence=scenario_artifacts,
            evidence_name="buyer_register",
        )

        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "buyer")
        buyer = setup_helper.login_existing_user_api(
            buyer.email,
            buyer.password,
            evidence=scenario_artifacts,
            evidence_name="buyer_login_api",
        )
        product = setup_helper.choose_product(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="product_choice",
        )
        voucher = setup_helper.ensure_voucher(
            product.price,
            evidence=scenario_artifacts,
            evidence_name="ensure_voucher",
            force_create=bool(settings.voucher_admin_token),
        )
        expected = setup_helper.expected_total(product.price, voucher, evidence=scenario_artifacts)

        pages.wallet.load()
        before_transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="wallet_transactions_before",
        ).payload
        wallet_balance_ui_before = parse_currency(pages.wallet.balance_text())
        target_balance = expected["total_paid"] + Decimal("50000")
        top_up_amount = round_up_to_step(
            max(Decimal("0"), target_balance - wallet_balance_ui_before),
            Decimal("10000"),
        )
        if top_up_amount > 0:
            pages.wallet.top_up(int(top_up_amount))
            pages.wallet.wait_for_top_up_success()
        scenario_artifacts.save_screenshot("wallet_after_topup.png", pages.driver)

        after_topup_balance = Decimal(
            str(
                services.wallet.get_balance(
                    buyer.user_id,
                    token=buyer.token,
                    evidence=scenario_artifacts,
                    evidence_name="wallet_after_topup",
                ).payload["balance"]
            )
        )
        assert parse_currency(pages.wallet.balance_text()) == after_topup_balance

        pages.catalog.load()
        pages.catalog.open_product_by_name(product.name)
        pages.product_detail.wait_loaded()
        pages.product_detail.click_buy_now()

        pages.checkout.wait_loaded()
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.set_voucher_code(voucher.code)
        scenario_artifacts.save_screenshot("checkout_before_submit.png", pages.driver)
        pages.checkout.submit()

        pages.result.wait_loaded()
        scenario_artifacts.save_screenshot("checkout_result.png", pages.driver)
        order_id = pages.result.order_id()
        order_detail = services.order.detail(
            order_id,
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="order_detail",
        ).payload["data"]
        assert str(order_detail["status"]).upper() == "PAID"

        pages.orders.load()
        assert pages.orders.has_order(order_id)
        scenario_artifacts.save_screenshot("orders_history.png", pages.driver)
        pages.orders.open_order(order_id)
        pages.result.wait_loaded()

        active_orders = services.order.list_my_active(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="active_orders",
        ).payload["data"]
        assert any(int(item["id"]) == order_id for item in active_orders)

        transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="wallet_transactions_after_checkout",
        ).payload
        assert len(transactions) >= len(before_transactions) + 2
        assert any(str(item.get("type")) == "TOPUP" for item in transactions)
        assert any(str(item.get("type")) == "PAYMENT" for item in transactions_for_order(transactions, order_id))

        details.update(
            {
                "buyer_id": buyer.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "order_id": order_id,
                "wallet_balance_after_topup": str(after_topup_balance),
                "order_detail": order_detail,
            }
        )
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        scenario_artifacts.save_screenshot("failure.png", pages.driver)
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise


@pytest.mark.live
def test_order_lifecycle_invalid_transition_and_rating(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "order_lifecycle_invalid_transition_and_rating"
    details = {}

    try:
        jastiper = setup_helper.login_existing_user_api(
            settings.jastiper_email,
            settings.jastiper_password,
            evidence=scenario_artifacts,
            evidence_name="jastiper_login_api",
        )
        buyer, product, voucher, _expected, order_payload = build_paid_order(
            settings,
            services,
            setup_helper,
            scenario_artifacts,
            "lifecycle",
            jastiper.user_id,
        )
        order_id = int(order_payload["id"])

        invalid_transition = services.order.update_status(
            order_id,
            jastiper.token,
            "COMPLETED",
            evidence=scenario_artifacts,
            evidence_name="invalid_transition",
        )
        assert invalid_transition.status_code == 409
        assert invalid_transition.payload["error"]["code"] == "INVALID_ORDER_STATUS_TRANSITION"

        ui_login(pages, jastiper.email, settings.jastiper_password, scenario_artifacts, "jastiper")
        pages.jastiper.load()
        assert pages.jastiper.has_order(order_id)
        scenario_artifacts.save_screenshot("jastiper_queue_paid.png", pages.driver)

        pages.jastiper.click_transition(order_id, "Purchased")
        pages.jastiper.wait_for_notice(f"Order {order_id} moved to Purchased.")
        scenario_artifacts.save_screenshot("jastiper_queue_purchased.png", pages.driver)

        pages.jastiper.click_transition(order_id, "Shipped")
        pages.jastiper.wait_for_notice(f"Order {order_id} moved to Shipped.")
        scenario_artifacts.save_screenshot("jastiper_queue_shipped.png", pages.driver)

        pages.jastiper.click_transition(order_id, "Completed")
        pages.jastiper.wait_for_notice(f"Order {order_id} moved to Completed.")
        scenario_artifacts.save_screenshot("jastiper_queue_completed.png", pages.driver)

        completed_detail = services.order.detail(
            order_id,
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="completed_order_detail",
        ).payload["data"]
        assert str(completed_detail["status"]).upper() == "COMPLETED"

        ui_logout_if_needed(pages)
        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "buyer_after_complete")
        pages.orders.load()
        pages.orders.open_order(order_id)
        pages.result.wait_loaded()
        pages.result.submit_rating(5, 4, "Delivered and matched the listing.")
        pages.result.wait_for_rating_success()
        scenario_artifacts.save_screenshot("buyer_rating_submitted.png", pages.driver)

        rated_detail = services.order.detail(
            order_id,
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="rated_order_detail",
        ).payload["data"]
        assert rated_detail["rating"]["productRating"] == 5
        assert rated_detail["rating"]["jastiperRating"] == 4

        details.update(
            {
                "buyer_id": buyer.user_id,
                "jastiper_id": jastiper.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "order_id": order_id,
                "invalid_transition": invalid_transition.payload,
                "rated_order_detail": rated_detail,
            }
        )
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        scenario_artifacts.save_screenshot("failure.png", pages.driver)
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise


@pytest.mark.live
def test_cancel_refund_is_idempotent(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "cancel_refund_is_idempotent"
    details = {}

    try:
        jastiper = setup_helper.login_existing_user_api(
            settings.jastiper_email,
            settings.jastiper_password,
            evidence=scenario_artifacts,
            evidence_name="jastiper_login_api",
        )
        buyer, product, voucher, _expected, order_payload = build_paid_order(
            settings,
            services,
            setup_helper,
            scenario_artifacts,
            "cancel",
            jastiper.user_id,
        )
        order_id = int(order_payload["id"])

        balance_before_cancel = Decimal(
            str(
                services.wallet.get_balance(
                    buyer.user_id,
                    token=buyer.token,
                    evidence=scenario_artifacts,
                    evidence_name="balance_before_cancel",
                ).payload["balance"]
            )
        )

        ui_login(pages, jastiper.email, settings.jastiper_password, scenario_artifacts, "jastiper_cancel")
        pages.jastiper.load()
        assert pages.jastiper.has_order(order_id)
        pages.jastiper.cancel_order(order_id)
        pages.jastiper.wait_for_notice(f"Order {order_id} was cancelled and refunded.")
        scenario_artifacts.save_screenshot("jastiper_cancelled.png", pages.driver)

        cancelled_detail = services.order.detail(
            order_id,
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="cancelled_order_detail",
        ).payload["data"]
        assert str(cancelled_detail["status"]).upper() == "CANCELLED"
        assert bool(cancelled_detail["refundDone"]) is True

        balance_after_cancel = Decimal(
            str(
                services.wallet.get_balance(
                    buyer.user_id,
                    token=buyer.token,
                    evidence=scenario_artifacts,
                    evidence_name="balance_after_cancel",
                ).payload["balance"]
            )
        )
        assert balance_after_cancel == balance_before_cancel + Decimal(str(cancelled_detail["totalPaid"]))

        second_cancel = services.order.cancel(
            order_id,
            jastiper.token,
            evidence=scenario_artifacts,
            evidence_name="cancel_second_attempt",
        )
        assert second_cancel.status_code == 200
        second_payload = second_cancel.payload["data"]
        assert str(second_payload["status"]).upper() == "CANCELLED"
        assert bool(second_payload["refundDone"]) is True

        balance_after_second_cancel = Decimal(
            str(
                services.wallet.get_balance(
                    buyer.user_id,
                    token=buyer.token,
                    evidence=scenario_artifacts,
                    evidence_name="balance_after_second_cancel",
                ).payload["balance"]
            )
        )
        assert balance_after_second_cancel == balance_after_cancel

        transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="transactions_after_cancel",
        ).payload
        refund_transactions = transactions_for_order(transactions, order_id, "REFUND")
        assert len(refund_transactions) == 1

        ui_logout_if_needed(pages)
        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "buyer_cancelled")
        pages.orders.load()
        pages.orders.open_order(order_id)
        pages.result.wait_loaded()
        assert pages.result.has_refund_notice()
        scenario_artifacts.save_screenshot("buyer_refund_notice.png", pages.driver)

        details.update(
            {
                "buyer_id": buyer.user_id,
                "jastiper_id": jastiper.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "order_id": order_id,
                "balance_before_cancel": str(balance_before_cancel),
                "balance_after_cancel": str(balance_after_cancel),
                "refund_transaction_count": len(refund_transactions),
            }
        )
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        scenario_artifacts.save_screenshot("failure.png", pages.driver)
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise


@pytest.mark.live
def test_admin_voucher_management_and_public_visibility(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "admin_voucher_management_and_public_visibility"
    details = {}

    try:
        if not settings.voucher_admin_token:
            raise AssertionError("VOUCHER_ADMIN_TOKEN is required for the admin voucher scenario.")

        admin = setup_helper.login_existing_user_api(
            settings.admin_email,
            settings.admin_password,
            evidence=scenario_artifacts,
            evidence_name="admin_login_api",
        )

        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin")
        pages.admin.load()
        pages.admin.set_admin_token(settings.voucher_admin_token)
        scenario_artifacts.save_screenshot("admin_console_loaded.png", pages.driver)

        code = f"E2E{datetime.utcnow().strftime('%H%M%S%f')}"
        pages.admin.fill_voucher_form(code=code, discount_value=15000, quota_total=11)
        pages.admin.submit_form(editing=False)
        pages.admin.wait_for_voucher(code)
        scenario_artifacts.save_screenshot("admin_voucher_created.png", pages.driver)

        pages.admin.start_edit_voucher(code)
        updated_end_at = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%dT%H:%M")
        pages.admin.fill_voucher_form(quota_total=17, end_at=updated_end_at)
        pages.admin.submit_form(editing=True)
        pages.admin.wait_for_voucher(code)
        scenario_artifacts.save_screenshot("admin_voucher_updated.png", pages.driver)

        admin_vouchers = services.voucher.list_admin(
            settings.voucher_admin_token,
            evidence=scenario_artifacts,
            evidence_name="admin_vouchers_after_update",
        ).payload
        updated_voucher = next(item for item in admin_vouchers if normalize_code(item["code"]) == code)
        assert int(updated_voucher["quotaTotal"]) == 17

        pages.admin.disable_voucher(code)
        pages.admin.wait_for_voucher_status(code, "INACTIVE")
        scenario_artifacts.save_screenshot("admin_voucher_disabled.png", pages.driver)
        assert pages.admin.voucher_status_text(code).strip().upper() == "INACTIVE"

        public_vouchers = services.voucher.active(
            evidence=scenario_artifacts,
            evidence_name="public_active_after_disable",
        ).payload
        assert all(normalize_code(item["code"]) != code for item in public_vouchers)

        admin_orders = services.order.list_admin(
            admin.token,
            evidence=scenario_artifacts,
            evidence_name="admin_orders",
        ).payload["data"]

        details.update(
            {
                "admin_id": admin.user_id,
                "voucher_code": code,
                "voucher_id": updated_voucher["id"],
                "admin_order_count": len(admin_orders),
                "public_active_count": len(public_vouchers),
            }
        )
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        scenario_artifacts.save_screenshot("failure.png", pages.driver)
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise
