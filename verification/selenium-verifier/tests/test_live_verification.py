from __future__ import annotations

import re
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


def register_and_login_via_ui(pages, setup_helper, services, evidence):
    user = setup_helper.new_user("ui-audit")
    method = "ui"

    try:
        pages.home.load()
        evidence.save_screenshot("01_home.png", pages.driver)
        pages.home.start_register()
        pages.register.register(user.email, user.username, user.password)
        pages.login.wait_for_text("Log in to continue")
    except Exception:
        method = "api_fallback"
        user = setup_helper.new_user("api-fallback")
        user = setup_helper.register_user_api(user, evidence=evidence, evidence_name="register_api_fallback")
        pages.login.load()

    evidence.save_screenshot("02_login.png", pages.driver)
    pages.login.login(user.email, user.password)
    pages.login.wait_for_success()
    evidence.save_screenshot("03_logged_in.png", pages.driver)

    token = browser_token(pages.driver)
    me_payload = services.auth.me(token, evidence=evidence, evidence_name="auth_me").payload
    browser_profile = browser_user(pages.driver)

    return {
        "user": {
            "email": user.email,
            "username": user.username,
            "password": user.password,
            "token": token,
            "user_id": int(me_payload["id"]),
        },
        "auth_me": me_payload,
        "browser_profile": browser_profile,
        "registration_method": method,
    }


@pytest.mark.live
def test_health_and_environment_sanity(settings, artifact_manager, scenario_artifacts):
    scenario = "health_and_environment_sanity"
    details = {"frontend_url_tested": settings.frontend_base_url}

    try:
        print(f"[verifier] Testing frontend URL: {settings.frontend_base_url}")
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
def test_register_login_catalog_wallet_session(
    settings,
    services,
    setup_helper,
    browser,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "register_login_catalog_wallet_session"
    details = {}

    try:
        auth_state = register_and_login_via_ui(pages, setup_helper, services, scenario_artifacts)
        user = auth_state["user"]

        pages.catalog.load()
        card_count = pages.catalog.card_count()
        assert card_count > 0, "Catalog did not render any product cards."
        scenario_artifacts.save_screenshot("04_catalog.png", pages.driver)

        pages.driver.refresh()
        pages.catalog.wait_for_text("Browse demo-ready products")
        assert user["email"] in pages.catalog.user_chip_text()

        product = setup_helper.choose_product(
            user["token"],
            evidence=scenario_artifacts,
            evidence_name="product_choice",
        )
        pages.catalog.open_product_by_name(product.name)
        pages.product_detail.wait_loaded()
        scenario_artifacts.save_screenshot("05_product_detail.png", pages.driver)

        ui_price = parse_currency(pages.product_detail.price_text())
        stock_match = re.search(r"(\d+)", pages.product_detail.stock_text())
        assert stock_match, "Could not parse stock from product detail."
        ui_stock = int(stock_match.group(1))
        assert pages.product_detail.product_id() == product.product_id
        assert pages.product_detail.product_name() == product.name
        assert ui_price == product.price
        assert ui_stock == product.stock

        pages.wallet.load()
        wallet_balance_ui_before = parse_currency(pages.wallet.balance_text())
        wallet_balance_api_before = Decimal(
            str(
                services.wallet.get_balance(
                    user["user_id"],
                    token=user["token"],
                    evidence=scenario_artifacts,
                    evidence_name="wallet_before",
                ).payload["balance"]
            )
        )
        assert wallet_balance_ui_before == wallet_balance_api_before
        scenario_artifacts.save_screenshot("06_wallet_before_topup.png", pages.driver)

        pages.wallet.top_up(settings.default_topup_amount)
        success_text = pages.wallet.wait_for_top_up_success()
        wallet_balance_ui_after = parse_currency(pages.wallet.balance_text())
        wallet_balance_api_after = Decimal(
            str(
                services.wallet.get_balance(
                    user["user_id"],
                    token=user["token"],
                    evidence=scenario_artifacts,
                    evidence_name="wallet_after",
                ).payload["balance"]
            )
        )
        scenario_artifacts.save_screenshot("07_wallet_after_topup.png", pages.driver)

        assert "Top-up completed." in success_text
        assert wallet_balance_ui_after == wallet_balance_api_after
        assert wallet_balance_ui_after > wallet_balance_ui_before

        pages.orders.load()
        pages.driver.refresh()
        pages.orders.wait_for_text("My checkout results")
        assert user["email"] in pages.orders.user_chip_text()
        pages.orders.logout()
        pages.home.wait_for_text("Start with register")
        scenario_artifacts.save_screenshot("08_logged_out.png", pages.driver)

        details.update(
            {
                "registration_method": auth_state["registration_method"],
                "auth_me": auth_state["auth_me"],
                "browser_profile": auth_state["browser_profile"],
                "catalog_card_count": card_count,
                "wallet_before": str(wallet_balance_ui_before),
                "wallet_after": str(wallet_balance_ui_after),
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
def test_successful_checkout_with_before_after_state_proof(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "successful_checkout_with_before_after_state_proof"
    details = {}

    try:
        user = setup_helper.register_user_api(
            setup_helper.new_user("checkout-success"),
            evidence=scenario_artifacts,
            evidence_name="register_api",
        )
        pages.login.load()
        pages.login.login(user.email, user.password)
        pages.login.wait_for_success()
        user = setup_helper.login_user_api(user, evidence=scenario_artifacts, evidence_name="login_api")

        product = setup_helper.choose_product(
            user.token,
            evidence=scenario_artifacts,
            evidence_name="chosen_product",
        )
        voucher = setup_helper.ensure_voucher(
            product.price,
            evidence=scenario_artifacts,
            evidence_name="ensure_voucher",
            force_create=bool(settings.voucher_admin_token),
        )
        expected = setup_helper.expected_total(product.price, voucher, evidence=scenario_artifacts)

        target_balance = expected["total_paid"] + min(Decimal("100000"), max(Decimal("1"), expected["total_paid"] / 2))
        pages.wallet.load()
        wallet_ui_before = parse_currency(pages.wallet.balance_text())
        top_up_amount = round_up_to_step(max(Decimal("0"), target_balance - wallet_ui_before), Decimal("10000"))
        if top_up_amount > 0:
            pages.wallet.top_up(int(top_up_amount))
            pages.wallet.wait_for_top_up_success()
        wallet_ui_after = parse_currency(pages.wallet.balance_text())
        wallet_api_after = Decimal(
            str(
                services.wallet.get_balance(
                    user.user_id,
                    token=user.token,
                    evidence=scenario_artifacts,
                    evidence_name="wallet_after_topup",
                ).payload["balance"]
            )
        )
        assert wallet_ui_after == wallet_api_after
        scenario_artifacts.save_screenshot("01_wallet_ready.png", pages.driver)

        before_state = setup_helper.capture_state(
            user,
            product.product_id,
            voucher.code,
            evidence=scenario_artifacts,
            prefix="before_checkout",
        )
        scenario_artifacts.write_json("before_state.json", before_state)

        pages.catalog.load()
        pages.catalog.open_product_by_name(product.name)
        pages.product_detail.wait_loaded()
        scenario_artifacts.save_screenshot("02_product_detail.png", pages.driver)
        assert pages.product_detail.product_id() == product.product_id
        assert pages.product_detail.product_name() == product.name
        assert parse_currency(pages.product_detail.price_text()) == product.price
        pages.product_detail.click_buy_now()

        pages.checkout.wait_loaded()
        assert parse_currency(pages.checkout.wallet_balance_text()) == before_state.wallet_balance
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.set_voucher_code(voucher.code)
        scenario_artifacts.save_screenshot("03_checkout.png", pages.driver)
        pages.checkout.submit()

        pages.result.wait_loaded()
        scenario_artifacts.save_screenshot("04_result.png", pages.driver)
        order_id = pages.result.order_id()
        order_status_ui = pages.result.status_text()
        total_paid_ui = parse_currency(pages.result.total_paid_text())
        voucher_ui = pages.result.voucher_text()

        after_state = setup_helper.capture_state(
            user,
            product.product_id,
            voucher.code,
            evidence=scenario_artifacts,
            prefix="after_checkout",
        )
        scenario_artifacts.write_json("after_state.json", after_state)
        order_detail = services.order.detail(
            order_id,
            user.token,
            evidence=scenario_artifacts,
            evidence_name="order_detail",
        ).payload["data"]

        pages.result.back_to_orders()
        assert pages.orders.has_order(order_id)
        scenario_artifacts.save_screenshot("05_orders.png", pages.driver)
        pages.orders.open_order(order_id)
        pages.result.wait_loaded()
        scenario_artifacts.save_screenshot("06_order_detail_from_orders.png", pages.driver)

        assert before_state.stock - after_state.stock == 1
        assert before_state.wallet_balance - after_state.wallet_balance == Decimal(str(order_detail["totalPaid"]))
        assert before_state.voucher_quota is not None and after_state.voucher_quota is not None
        assert before_state.voucher_quota - after_state.voucher_quota == 1
        assert after_state.order_count == before_state.order_count + 1
        assert str(order_detail["status"]).upper() in {"PAID", "PENDING"}
        assert order_status_ui.strip().upper() in {"PAID", "PENDING"}
        assert total_paid_ui == Decimal(str(order_detail["totalPaid"]))
        assert normalize_code(voucher_ui) == normalize_code(voucher.code)
        assert Decimal(str(order_detail["discountTotal"])) == Decimal(str(expected["discount"]))

        details.update(
            {
                "user_id": user.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "order_id": order_id,
                "before_state": before_state,
                "after_state": after_state,
                "expected": expected,
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
def test_failed_checkout_with_insufficient_balance_preserves_state(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "failed_checkout_with_insufficient_balance_preserves_state"
    details = {}

    try:
        user = setup_helper.register_user_api(
            setup_helper.new_user("checkout-fail"),
            evidence=scenario_artifacts,
            evidence_name="register_api",
        )
        pages.login.load()
        pages.login.login(user.email, user.password)
        pages.login.wait_for_success()
        user = setup_helper.login_user_api(user, evidence=scenario_artifacts, evidence_name="login_api")

        product = setup_helper.choose_product(
            user.token,
            evidence=scenario_artifacts,
            evidence_name="chosen_product",
        )
        voucher = setup_helper.ensure_voucher(
            product.price,
            evidence=scenario_artifacts,
            evidence_name="ensure_voucher",
            force_create=bool(settings.voucher_admin_token),
        )
        expected = setup_helper.expected_total(product.price, voucher, evidence=scenario_artifacts)
        insufficient_target = max(Decimal("0"), expected["total_paid"] - Decimal("1"))
        setup_helper.top_up_to_balance(
            user,
            insufficient_target,
            evidence=scenario_artifacts,
            prefix="topup_insufficient",
        )

        before_state = setup_helper.capture_state(
            user,
            product.product_id,
            voucher.code,
            evidence=scenario_artifacts,
            prefix="before_failure",
        )
        scenario_artifacts.write_json("before_state.json", before_state)

        preflight = services.order.checkout(
            user.token,
            setup_helper.checkout_body(product.product_id, 1, voucher.code),
            evidence=scenario_artifacts,
            evidence_name="api_preflight_failure",
        )
        assert preflight.status_code == 409
        assert preflight.payload["error"]["code"] == "WALLET_INSUFFICIENT"

        mid_state = setup_helper.capture_state(
            user,
            product.product_id,
            voucher.code,
            evidence=scenario_artifacts,
            prefix="after_preflight",
        )
        assert mid_state == before_state

        pages.catalog.load()
        pages.catalog.open_product_by_name(product.name)
        pages.product_detail.wait_loaded()
        pages.product_detail.click_buy_now()
        pages.checkout.wait_loaded()
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.set_voucher_code(voucher.code)
        scenario_artifacts.save_screenshot("01_checkout_before_failure.png", pages.driver)
        pages.checkout.submit()
        error_text = pages.checkout.error_text()
        scenario_artifacts.save_screenshot("02_checkout_failure.png", pages.driver)

        after_state = setup_helper.capture_state(
            user,
            product.product_id,
            voucher.code,
            evidence=scenario_artifacts,
            prefix="after_failure",
        )
        scenario_artifacts.write_json("after_state.json", after_state)

        assert "Wallet balance is insufficient." in error_text
        assert after_state == before_state

        details.update(
            {
                "user_id": user.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "before_state": before_state,
                "after_state": after_state,
                "expected": expected,
                "api_preflight_error": preflight.payload,
                "ui_error_text": error_text,
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
def test_voucher_validation_checks(settings, services, setup_helper, artifact_manager, scenario_artifacts):
    scenario = "voucher_validation_checks"
    details = {}

    try:
        if not settings.internal_api_token:
            raise AssertionError("INTERNAL_API_TOKEN is required for direct voucher validation checks.")

        user = setup_helper.register_user_api(
            setup_helper.new_user("voucher-check"),
            evidence=scenario_artifacts,
            evidence_name="register_api",
        )
        product = setup_helper.choose_product(
            user.token,
            evidence=scenario_artifacts,
            evidence_name="chosen_product",
        )
        voucher = setup_helper.ensure_voucher(
            product.price,
            evidence=scenario_artifacts,
            evidence_name="ensure_voucher",
        )

        valid = services.voucher.validate(
            voucher.code,
            float(product.price),
            settings.internal_api_token,
            evidence=scenario_artifacts,
            evidence_name="valid_voucher",
        ).payload
        invalid = services.voucher.validate(
            "THISDOESNOTEXIST",
            float(product.price),
            settings.internal_api_token,
            evidence=scenario_artifacts,
            evidence_name="invalid_voucher",
        ).payload

        assert valid["valid"] is True
        assert Decimal(str(valid["discountAmount"])) > 0
        assert invalid["valid"] is False

        details.update({"valid": valid, "invalid": invalid})
        scenario_artifacts.write_json("details.json", details)
        artifact_manager.record_scenario(scenario, VERIFIED, details)
    except Exception as error:  # noqa: BLE001
        details["error"] = str(error)
        scenario_artifacts.write_json("failure.json", details)
        artifact_manager.record_scenario(scenario, FAILED, details)
        raise
