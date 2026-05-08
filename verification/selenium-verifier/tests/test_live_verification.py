from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from urllib.parse import urlparse

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
        pages.home.wait_for_text("Create Account")


def wait_for_path(pages, expected_path: str) -> None:
    pages.home.wait_for_path(expected_path)


def session_snapshot(pages) -> dict:
    profile = browser_user(pages.driver)
    return {
        "token_present": pages.home.local_storage_has_key("json.sessionToken"),
        "user_present": pages.home.local_storage_has_key("json.sessionUser"),
        "email": profile.get("email") if profile else None,
        "role": profile.get("role") if profile else None,
    }


def require_admin_token(settings, reason: str) -> str:
    if not settings.voucher_admin_token:
        pytest.skip(reason)
    return settings.voucher_admin_token


def voucher_payload(
    code: str,
    *,
    discount_type: str = "FIXED",
    discount_value: int = 15000,
    quota_total: int = 10,
    min_spend: int = 0,
    start_offset_days: int = -1,
    end_offset_days: int = 7,
) -> dict:
    now = datetime.utcnow()
    return {
        "code": code,
        "discountType": discount_type,
        "discountValue": discount_value,
        "startAt": (now + timedelta(days=start_offset_days)).strftime("%Y-%m-%dT%H:%M:%S"),
        "endAt": (now + timedelta(days=end_offset_days)).strftime("%Y-%m-%dT%H:%M:%S"),
        "minSpend": min_spend,
        "quotaTotal": quota_total,
    }


def build_paid_order(settings, services, setup_helper, scenario_artifacts, prefix: str, preferred_jastiper_id: int):
    buyer = setup_helper.register_user_api(
        setup_helper.new_user(prefix),
        evidence=scenario_artifacts,
        evidence_name=f"{prefix}_register",
    )
    excluded_product_ids: set[str] = set()
    attempts: list[dict[str, str | int]] = []

    for attempt_index in range(1, 6):
        product = setup_helper.choose_product(
            buyer.token,
            preferred_jastiper_id=preferred_jastiper_id,
            excluded_product_ids=excluded_product_ids,
            evidence=scenario_artifacts,
            evidence_name=f"{prefix}_product_{attempt_index}",
        )
        excluded_product_ids.add(product.product_id)

        voucher = setup_helper.ensure_voucher(
            product.price,
            evidence=scenario_artifacts,
            evidence_name=f"{prefix}_voucher_{attempt_index}",
            force_create=bool(settings.voucher_admin_token),
        )
        expected = setup_helper.expected_total(product.price, voucher, evidence=scenario_artifacts)
        target_balance = expected["total_paid"] + Decimal("50000")
        setup_helper.top_up_to_balance(
            buyer,
            target_balance,
            evidence=scenario_artifacts,
            prefix=f"{prefix}_topup_{attempt_index}",
        )
        checkout_response = services.order.checkout(
            buyer.token,
            setup_helper.checkout_body(product.product_id, 1, voucher.code),
            evidence=scenario_artifacts,
            evidence_name=f"{prefix}_checkout_{attempt_index}",
        )
        attempts.append(
            {
                "attempt": attempt_index,
                "product_id": product.product_id,
                "status_code": checkout_response.status_code,
            }
        )
        if checkout_response.status_code == 201:
            order_payload = checkout_response.payload["data"]
            return buyer, product, voucher, expected, order_payload
        if checkout_response.status_code == 409 and "INSUFFICIENT_STOCK" in checkout_response.text:
            continue
        raise AssertionError(f"Checkout did not succeed: {checkout_response.text}")

    raise AssertionError(f"Checkout could not find an in-stock product after retries: {attempts}")


def transactions_for_order(transactions: list[dict], order_id: int, txn_type: str | None = None) -> list[dict]:
    matched = [item for item in transactions if int(item.get("refId") or -1) == order_id]
    if txn_type:
        matched = [item for item in matched if str(item.get("type")) == txn_type]
    return matched


@pytest.mark.live
@pytest.mark.smoke
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
@pytest.mark.smoke
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
@pytest.mark.edge
@pytest.mark.smoke
def test_invalid_login_and_logout_clears_session(
    settings,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "invalid_login_and_logout_clears_session"
    details = {}

    try:
        ui_logout_if_needed(pages)
        pages.login.load()
        pages.login.login(settings.buyer_email, f"{settings.buyer_password}-wrong")
        invalid_error = pages.login.wait_for_error()
        scenario_artifacts.save_screenshot("invalid_login.png", pages.driver)
        assert any(fragment in invalid_error.lower() for fragment in ["invalid", "credential", "password", "login"])
        assert not pages.login.local_storage_has_key("json.sessionToken")
        assert not pages.login.local_storage_has_key("json.sessionUser")

        pages.login.login(settings.buyer_email, settings.buyer_password)
        pages.login.wait_for_success()
        pages.catalog.wait_for_local_storage_key("json.sessionToken")
        logged_in_session = session_snapshot(pages)
        scenario_artifacts.save_screenshot("logged_in.png", pages.driver)
        assert logged_in_session["token_present"] is True
        assert logged_in_session["user_present"] is True
        assert logged_in_session["email"] == settings.buyer_email

        pages.catalog.refresh()
        pages.catalog.wait_for_text("Browse the newest limited drops.")
        pages.profile.load()
        refreshed_session = session_snapshot(pages)
        scenario_artifacts.save_screenshot("after_refresh.png", pages.driver)
        assert refreshed_session["email"] == settings.buyer_email
        assert settings.buyer_email in pages.profile.heading_text() or refreshed_session["role"] == pages.profile.role_badge_text()

        pages.profile.logout_via_ui()
        pages.home.wait_for_text("Create Account")
        pages.home.wait_for_local_storage_absent("json.sessionToken")
        pages.home.wait_for_local_storage_absent("json.sessionUser")
        after_logout_session = session_snapshot(pages)
        scenario_artifacts.save_screenshot("after_logout.png", pages.driver)
        assert after_logout_session["token_present"] is False
        assert after_logout_session["user_present"] is False

        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/wallet")
        pages.login.wait_for_text("Log in to continue.")
        wait_for_path(pages, "/login")

        details.update(
            {
                "invalid_login_error": invalid_error,
                "logged_in_session": logged_in_session,
                "refreshed_session": refreshed_session,
                "after_logout_session": after_logout_session,
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
def test_milestone25_register_login_browse_profile_and_alias_routes(
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "milestone25_register_login_browse_profile_and_alias_routes"
    details = {}

    try:
        ui_logout_if_needed(pages)
        pages.home.load()
        scenario_artifacts.save_screenshot("landing_home.png", pages.driver)

        service_health_cards = pages.home.service_health_count()
        assert service_health_cards >= 4, "Expected the landing page health section to render service cards."

        buyer = setup_helper.new_user("ui-register")
        pages.home.start_register()
        pages.register.register(buyer.email, buyer.username, buyer.password)
        wait_for_path(pages, "/login")
        assert "Registration successful" in pages.login.flash_text()
        assert pages.login.email_value() == buyer.email
        scenario_artifacts.save_screenshot("register_redirect_login.png", pages.driver)

        pages.login.login(buyer.email, buyer.password)
        pages.login.wait_for_success()
        session_profile = browser_user(pages.driver)
        assert session_profile is not None
        assert session_profile["email"] == buyer.email
        assert pages.catalog.card_count() > 0

        pages.catalog.open_first_product()
        pages.product_detail.wait_loaded()
        scenario_artifacts.save_screenshot("registered_buyer_product_detail.png", pages.driver)
        detail_path = urlparse(pages.driver.current_url).path
        assert detail_path.startswith("/product/") or detail_path.startswith("/products/")

        pages.profile.load()
        assert pages.profile.role_badge_text() == session_profile["role"]
        assert pages.profile.has_card("Wallet")
        assert pages.profile.has_card("Orders")
        assert not pages.profile.has_card("Jastiper Queue")
        assert not pages.profile.has_card("Admin Console")
        scenario_artifacts.save_screenshot("buyer_profile.png", pages.driver)

        pages.catalog.load_browse()
        browse_count = pages.catalog.card_count()
        assert browse_count > 0
        pages.catalog.load()
        products_count = pages.catalog.card_count()
        assert products_count > 0

        details.update(
            {
                "buyer_email": buyer.email,
                "buyer_role": session_profile["role"],
                "landing_service_health_cards": service_health_cards,
                "browse_count": browse_count,
                "products_count": products_count,
                "detail_path": detail_path,
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
@pytest.mark.edge
def test_profile_update_persists_in_ui_and_auth_service(
    setup_helper,
    services,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "profile_update_persists_in_ui_and_auth_service"
    details = {}

    try:
        buyer = setup_helper.register_user_api(
            setup_helper.new_user("profile-update"),
            evidence=scenario_artifacts,
            evidence_name="profile_update_register",
        )
        new_username = f"{buyer.username}-refined"
        new_full_name = "Profile Update Buyer"

        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "profile_update_login")
        pages.profile.load()
        pages.profile.update_profile(new_username, new_full_name)
        pages.profile.wait_for_notice("Profile updated successfully.")
        scenario_artifacts.save_screenshot("profile_updated.png", pages.driver)

        assert pages.profile.heading_text() == new_full_name
        assert f"@{new_username}" in pages.profile.identity_text()

        api_profile = services.auth.me(
            browser_token(pages.driver),
            evidence=scenario_artifacts,
            evidence_name="profile_update_me",
        ).payload
        assert api_profile["username"] == new_username
        assert api_profile["fullName"] == new_full_name

        pages.profile.refresh()
        pages.profile.wait_for_notice("Save Profile")
        refreshed_session = browser_user(pages.driver)
        assert refreshed_session is not None
        assert refreshed_session["username"] == new_username
        assert refreshed_session["fullName"] == new_full_name
        scenario_artifacts.save_screenshot("profile_updated_after_refresh.png", pages.driver)

        details.update(
            {
                "buyer_id": buyer.user_id,
                "updated_username": new_username,
                "updated_full_name": new_full_name,
                "api_profile": api_profile,
                "browser_session": refreshed_session,
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
def test_route_guards_search_filters_and_role_navigation(
    settings,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "route_guards_search_filters_and_role_navigation"
    details = {}

    try:
        ui_logout_if_needed(pages)
        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/wallet")
        pages.login.wait_for_text("Log in to continue.")
        wait_for_path(pages, "/login")
        scenario_artifacts.save_screenshot("protected_wallet_redirect.png", pages.driver)

        pages.login.login(settings.buyer_email, settings.buyer_password)
        pages.wallet.wait_for_text("Add balance instantly")
        wait_for_path(pages, "/wallet")
        scenario_artifacts.save_screenshot("wallet_after_guarded_login.png", pages.driver)

        buyer_profile = browser_user(pages.driver)
        assert buyer_profile is not None
        pages.profile.load()
        assert pages.profile.role_badge_text() == buyer_profile["role"]
        assert pages.profile.has_card("Wallet")
        assert pages.profile.has_card("Orders")
        assert not pages.profile.has_card("Jastiper Queue")
        assert not pages.profile.has_card("Admin Console")

        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/admin")
        pages.home.wait_for_text("Secure hype drops through the newer JSON storefront.")
        wait_for_path(pages, "/")

        pages.catalog.load_browse()
        names_before = pages.catalog.visible_product_names()
        assert names_before, "Expected catalog names before search."
        query = names_before[0].split()[0]
        pages.catalog.search(query)
        pages.wait.until(
            lambda _driver: all(query.lower() in name.lower() for name in pages.catalog.visible_product_names())
        )
        names_after_search = pages.catalog.visible_product_names()
        assert names_after_search
        categories = [label for label in pages.catalog.category_labels() if label.upper() != "ALL"]
        selected_category = None
        category_result_count = None
        category_badges = []
        if categories:
            selected_category = categories[0]
            pages.catalog.select_category(selected_category)
            category_badges = pages.catalog.wait_for_category_badges(selected_category)
            category_result_count = len(pages.catalog.visible_product_names())
            assert category_result_count > 0
        scenario_artifacts.save_screenshot("catalog_search_and_filter.png", pages.driver)

        ui_logout_if_needed(pages)
        ui_login(pages, settings.jastiper_email, settings.jastiper_password, scenario_artifacts, "jastiper_nav")
        pages.profile.load()
        assert pages.profile.has_card("Jastiper Queue")
        assert not pages.profile.has_card("Admin Console")

        ui_logout_if_needed(pages)
        ui_login(pages, settings.admin_email, settings.admin_password, scenario_artifacts, "admin_nav")
        pages.profile.load()
        assert pages.profile.has_card("Jastiper Queue")
        assert pages.profile.has_card("Admin Console")
        scenario_artifacts.save_screenshot("admin_profile_cards.png", pages.driver)

        details.update(
            {
                "buyer_role": buyer_profile["role"],
                "search_query": query,
                "search_results": names_after_search,
                "selected_category": selected_category,
                "category_result_count": category_result_count,
                "category_badges": category_badges,
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
@pytest.mark.edge
def test_unauthorized_role_actions_are_rejected(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "unauthorized_role_actions_are_rejected"
    details = {}

    try:
        ui_logout_if_needed(pages)
        buyer_session = ui_login(
            pages,
            settings.buyer_email,
            settings.buyer_password,
            scenario_artifacts,
            "buyer_role_guard",
        )

        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/admin")
        pages.home.wait_for_text("Secure hype drops through the newer JSON storefront.")
        wait_for_path(pages, "/")
        scenario_artifacts.save_screenshot("buyer_blocked_admin.png", pages.driver)

        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/jastiper/orders")
        pages.home.wait_for_text("Secure hype drops through the newer JSON storefront.")
        wait_for_path(pages, "/")
        scenario_artifacts.save_screenshot("buyer_blocked_jastiper.png", pages.driver)

        jastiper = setup_helper.login_existing_user_api(
            settings.jastiper_email,
            settings.jastiper_password,
            evidence=scenario_artifacts,
            evidence_name="jastiper_login_api",
        )
        paid_buyer, product, voucher, _expected, order_payload = build_paid_order(
            settings,
            services,
            setup_helper,
            scenario_artifacts,
            "buyer-unauthorized-status",
            jastiper.user_id,
        )
        order_id = int(order_payload["id"])

        buyer_status_attempt = services.order.update_status(
            order_id,
            paid_buyer.token,
            "PURCHASED",
            evidence=scenario_artifacts,
            evidence_name="buyer_status_attempt",
        )
        assert buyer_status_attempt.status_code != 200
        assert buyer_status_attempt.status_code in {400, 401, 403, 409}

        ui_logout_if_needed(pages)
        ui_login(
            pages,
            settings.jastiper_email,
            settings.jastiper_password,
            scenario_artifacts,
            "jastiper_role_guard",
        )
        pages.driver.get(f"{settings.frontend_base_url.rstrip('/')}/admin")
        pages.home.wait_for_text("Secure hype drops through the newer JSON storefront.")
        wait_for_path(pages, "/")
        scenario_artifacts.save_screenshot("jastiper_blocked_admin.png", pages.driver)

        invalid_admin_attempt = services.voucher.list_admin(
            "invalid-token",
            expected_status=(400, 401, 403),
            evidence=scenario_artifacts,
            evidence_name="invalid_admin_token_api_rejection",
        )
        assert invalid_admin_attempt.status_code != 200

        details.update(
            {
                "buyer_profile": buyer_session["profile"],
                "order_id": order_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "buyer_status_attempt_status": buyer_status_attempt.status_code,
                "buyer_status_attempt_payload": buyer_status_attempt.payload,
                "invalid_admin_attempt_status": invalid_admin_attempt.status_code,
                "invalid_admin_attempt_payload": invalid_admin_attempt.payload,
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
@pytest.mark.smoke
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
@pytest.mark.edge
def test_checkout_rejects_insufficient_wallet_balance_without_side_effects(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "checkout_rejects_insufficient_wallet_balance_without_side_effects"
    details = {}

    try:
        buyer = setup_helper.register_user_api(
            setup_helper.new_user("insufficient-wallet"),
            evidence=scenario_artifacts,
            evidence_name="buyer_register",
        )
        product = setup_helper.choose_product(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="product_choice",
        )
        before_state = setup_helper.capture_state(
            buyer,
            product.product_id,
            None,
            evidence=scenario_artifacts,
            prefix="before_state",
        )
        before_transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="transactions_before",
        ).payload
        assert before_state.wallet_balance < product.price

        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "insufficient_wallet_buyer")
        pages.checkout.open(f"/checkout?productId={product.product_id}&qty=1")
        pages.checkout.wait_loaded()
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.submit()
        error_text = pages.checkout.error_text().lower()
        scenario_artifacts.save_screenshot("insufficient_wallet_checkout.png", pages.driver)
        assert any(fragment in error_text for fragment in ["balance", "insufficient", "fund", "payment"])

        after_state = setup_helper.capture_state(
            buyer,
            product.product_id,
            None,
            evidence=scenario_artifacts,
            prefix="after_state",
        )
        after_transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="transactions_after",
        ).payload
        payment_transactions = [item for item in after_transactions if str(item.get("type")) == "PAYMENT"]

        assert after_state.order_count == before_state.order_count
        assert after_state.wallet_balance == before_state.wallet_balance
        assert after_state.stock == before_state.stock
        assert len(after_transactions) == len(before_transactions)
        assert len(payment_transactions) == 0

        details.update(
            {
                "buyer_id": buyer.user_id,
                "product_id": product.product_id,
                "before_state": setup_helper.as_dict(before_state),
                "after_state": setup_helper.as_dict(after_state),
                "wallet_transaction_count_before": len(before_transactions),
                "wallet_transaction_count_after": len(after_transactions),
                "payment_transaction_count_after": len(payment_transactions),
                "error_text": error_text,
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
@pytest.mark.edge
def test_checkout_double_submit_creates_single_order_and_payment(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "checkout_double_submit_creates_single_order_and_payment"
    details = {}

    try:
        buyer = setup_helper.register_user_api(
            setup_helper.new_user("double-submit"),
            evidence=scenario_artifacts,
            evidence_name="buyer_register",
        )
        product = setup_helper.choose_product(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="product_choice",
        )
        expected = setup_helper.expected_total(product.price, None, evidence=scenario_artifacts)
        wallet_topup = setup_helper.top_up_to_balance(
            buyer,
            expected["total_paid"] + Decimal("50000"),
            evidence=scenario_artifacts,
            prefix="wallet_topup",
        )
        before_state = setup_helper.capture_state(
            buyer,
            product.product_id,
            None,
            evidence=scenario_artifacts,
            prefix="before_state",
        )
        before_transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="transactions_before",
        ).payload
        unique_address = f"Jl. Double Submit {datetime.utcnow().strftime('%H%M%S%f')}, Jakarta"

        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "double_submit_buyer")
        pages.checkout.open(f"/checkout?productId={product.product_id}&qty=1")
        pages.checkout.wait_loaded()
        pages.checkout.set_shipping_address(unique_address)
        submit_meta = pages.checkout.submit_twice_quickly()
        scenario_artifacts.save_screenshot("double_submit_busy_or_nav.png", pages.driver)

        pages.result.wait_loaded()
        order_id = pages.result.order_id()
        scenario_artifacts.save_screenshot("double_submit_result.png", pages.driver)

        after_orders = services.order.list_my(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="orders_after",
        ).payload["data"]
        order_detail = services.order.detail(
            order_id,
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="order_detail",
        ).payload["data"]
        duplicate_marker_orders = []
        for item in after_orders:
            if int(item["id"]) == order_id:
                duplicate_marker_orders.append(item)
                continue
            candidate_detail = services.order.detail(
                int(item["id"]),
                buyer.token,
                evidence=scenario_artifacts,
                evidence_name=f"order_detail_{item['id']}",
            ).payload["data"]
            if candidate_detail.get("shippingAddress") == unique_address:
                duplicate_marker_orders.append(candidate_detail)
        after_balance = Decimal(
            str(
                services.wallet.get_balance(
                    buyer.user_id,
                    token=buyer.token,
                    evidence=scenario_artifacts,
                    evidence_name="balance_after",
                ).payload["balance"]
            )
        )
        after_transactions = services.wallet.list_transactions(
            buyer.user_id,
            token=buyer.token,
            evidence=scenario_artifacts,
            evidence_name="transactions_after",
        ).payload
        payment_transactions = transactions_for_order(after_transactions, order_id, "PAYMENT")

        assert order_detail["shippingAddress"] == unique_address
        assert len(after_orders) == before_state.order_count + 1
        assert len(duplicate_marker_orders) == 1
        assert len(payment_transactions) == 1
        assert after_balance == Decimal(str(wallet_topup["after"])) - Decimal(str(order_detail["totalPaid"]))
        if not submit_meta["second_click_attempted"]:
            assert (
                submit_meta["disabled_after_click"]
                or "Processing" in submit_meta["busy_text"]
                or pages.result.current_path() != "/checkout"
            )

        details.update(
            {
                "buyer_id": buyer.user_id,
                "product_id": product.product_id,
                "order_id": order_id,
                "shipping_address_marker": unique_address,
                "submit_meta": submit_meta,
                "before_order_count": before_state.order_count,
                "after_order_count": len(after_orders),
                "matching_order_count": len(duplicate_marker_orders),
                "payment_transaction_count": len(payment_transactions),
                "wallet_transactions_before": len(before_transactions),
                "wallet_transactions_after": len(after_transactions),
                "limitation": "Duplicate-order detection is based on a fresh buyer plus a unique shipping-address marker because the current checkout contract has no explicit idempotency key.",
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
def test_invalid_voucher_rejection_and_public_voucher_ui(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "invalid_voucher_rejection_and_public_voucher_ui"
    details = {}

    try:
        buyer = setup_helper.register_user_api(
            setup_helper.new_user("invalid-voucher"),
            evidence=scenario_artifacts,
            evidence_name="buyer_register",
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
        setup_helper.top_up_to_balance(
            buyer,
            expected["total_paid"] + Decimal("30000"),
            evidence=scenario_artifacts,
            prefix="wallet_topup",
        )

        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "invalid_voucher_buyer")
        orders_before = services.order.list_my(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="orders_before_invalid_submit",
        ).payload["data"]

        pages.checkout.open(f"/checkout?productId={product.product_id}&qty=1")
        pages.checkout.wait_loaded()

        assert pages.checkout.has_public_voucher(voucher.code)
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.set_voucher_code("INVALID-CODE")
        assert "not in the active voucher list" in pages.checkout.voucher_banner_text().lower()
        scenario_artifacts.save_screenshot("invalid_voucher_banner.png", pages.driver)

        pages.checkout.submit()
        error_text = pages.checkout.error_text().lower()
        assert any(fragment in error_text for fragment in ["voucher", "invalid", "inactive", "not found"])

        orders_after_invalid = services.order.list_my(
            buyer.token,
            evidence=scenario_artifacts,
            evidence_name="orders_after_invalid_submit",
        ).payload["data"]
        assert len(orders_after_invalid) == len(orders_before)

        pages.checkout.set_voucher_code(voucher.code)
        assert "currently active" in pages.checkout.voucher_banner_text().lower()
        scenario_artifacts.save_screenshot("valid_voucher_banner.png", pages.driver)
        pages.checkout.submit()
        pages.result.wait_loaded()
        order_id = pages.result.order_id()
        assert order_id > 0
        scenario_artifacts.save_screenshot("valid_checkout_after_invalid_attempt.png", pages.driver)

        details.update(
            {
                "buyer_id": buyer.user_id,
                "product_id": product.product_id,
                "voucher_code": voucher.code,
                "order_id": order_id,
                "invalid_error": error_text,
                "orders_before": len(orders_before),
                "orders_after_invalid": len(orders_after_invalid),
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
@pytest.mark.admin
@pytest.mark.edge
def test_admin_voucher_rejects_missing_or_invalid_admin_token(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "admin_voucher_rejects_missing_or_invalid_admin_token"
    details = {}

    try:
        admin = setup_helper.login_existing_user_api(
            settings.admin_email,
            settings.admin_password,
            evidence=scenario_artifacts,
            evidence_name="admin_login_api",
        )
        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin_invalid_token")
        pages.admin.load()
        pages.admin.clear_admin_token()
        invalid_code = f"BADTOK{datetime.utcnow().strftime('%H%M%S%f')}"
        pages.admin.fill_voucher_form(code=invalid_code, discount_value=12000, quota_total=4)
        pages.admin.submit_form(editing=False)
        error_text = pages.admin.error_notice_text().lower()
        scenario_artifacts.save_screenshot("admin_invalid_token.png", pages.driver)
        assert any(fragment in error_text for fragment in ["token", "unauthorized", "forbidden", "invalid"])

        public_vouchers = services.voucher.active(
            evidence=scenario_artifacts,
            evidence_name="public_vouchers_after_invalid_admin_submit",
        ).payload
        assert all(normalize_code(item["code"]) != invalid_code for item in public_vouchers)

        details.update(
            {
                "admin_id": admin.user_id,
                "voucher_code": invalid_code,
                "error_text": error_text,
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


@pytest.mark.live
@pytest.mark.admin
@pytest.mark.edge
def test_admin_order_monitoring_and_checkout_visibility(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "admin_order_monitoring_and_checkout_visibility"
    details = {}

    try:
        admin_token = require_admin_token(settings, "VOUCHER_ADMIN_TOKEN is required for admin UI coverage.")

        jastiper = setup_helper.login_existing_user_api(
            settings.jastiper_email,
            settings.jastiper_password,
            evidence=scenario_artifacts,
            evidence_name="jastiper_login_api",
        )
        buyer, product, _voucher, _expected, order_payload = build_paid_order(
            settings,
            services,
            setup_helper,
            scenario_artifacts,
            "admin-monitor",
            jastiper.user_id,
        )
        order_id = int(order_payload["id"])

        admin = setup_helper.login_existing_user_api(
            settings.admin_email,
            settings.admin_password,
            evidence=scenario_artifacts,
            evidence_name="admin_login_api",
        )
        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin_monitoring")
        pages.admin.load()
        pages.admin.set_admin_token(admin_token)
        pages.wait.until(lambda _driver: pages.admin.order_card_count() > 0)
        pages.wait.until(lambda _driver: pages.admin.has_order(order_id))
        assert pages.admin.order_card_count() > 0
        assert pages.admin.has_order(order_id)
        pages.admin.open_order(order_id)
        pages.result.wait_loaded()
        assert pages.result.order_id() == order_id
        scenario_artifacts.save_screenshot("admin_open_order_detail.png", pages.driver)

        pages.admin.load()
        pages.admin.set_admin_token(admin_token)
        code = f"UIPUB{datetime.utcnow().strftime('%H%M%S%f')}"
        pages.admin.fill_voucher_form(code=code, discount_value=25000, quota_total=9)
        pages.admin.submit_form(editing=False)
        pages.admin.wait_for_voucher(code)
        scenario_artifacts.save_screenshot("admin_public_voucher_created.png", pages.driver)

        ui_logout_if_needed(pages)
        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "buyer_public_voucher")
        pages.checkout.open(f"/checkout?productId={product.product_id}&qty=1")
        pages.checkout.wait_loaded()
        assert pages.checkout.has_public_voucher(code)
        scenario_artifacts.save_screenshot("checkout_public_voucher_visible.png", pages.driver)

        ui_logout_if_needed(pages)
        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin_disable_public_voucher")
        pages.admin.load()
        pages.admin.set_admin_token(admin_token)
        pages.admin.disable_voucher(code)
        pages.admin.wait_for_voucher_status(code, "INACTIVE")
        scenario_artifacts.save_screenshot("admin_public_voucher_disabled.png", pages.driver)

        ui_logout_if_needed(pages)
        ui_login(pages, buyer.email, buyer.password, scenario_artifacts, "buyer_hidden_voucher")
        pages.checkout.open(f"/checkout?productId={product.product_id}&qty=1")
        pages.checkout.wait_loaded()
        assert not pages.checkout.has_public_voucher(code)
        pages.checkout.set_voucher_code(code)
        assert "not in the active voucher list" in pages.checkout.voucher_banner_text().lower()
        scenario_artifacts.save_screenshot("checkout_public_voucher_hidden.png", pages.driver)

        details.update(
            {
                "admin_id": admin.user_id,
                "buyer_id": buyer.user_id,
                "order_id": order_id,
                "product_id": product.product_id,
                "public_voucher_code": code,
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
@pytest.mark.admin
@pytest.mark.edge
def test_expired_and_quota_exhausted_vouchers_are_rejected_or_hidden(
    settings,
    services,
    setup_helper,
    pages,
    artifact_manager,
    scenario_artifacts,
):
    scenario = "expired_and_quota_exhausted_vouchers_are_rejected_or_hidden"
    details = {}

    try:
        admin_token = require_admin_token(settings, "VOUCHER_ADMIN_TOKEN is required for voucher edge-case coverage.")
        expired_code = f"EXP{datetime.utcnow().strftime('%H%M%S%f')}"
        quota_code = f"ONE{datetime.utcnow().strftime('%H%M%S%f')}"

        expired_create = services.voucher.create_admin(
            admin_token,
            voucher_payload(
                expired_code,
                discount_value=10000,
                quota_total=3,
                start_offset_days=-7,
                end_offset_days=-1,
            ),
            evidence=scenario_artifacts,
            evidence_name="expired_voucher_create",
        )
        assert expired_create.status_code in {200, 201}

        active_before_claim = services.voucher.active(
            evidence=scenario_artifacts,
            evidence_name="active_vouchers_after_expired_create",
        ).payload
        assert all(normalize_code(item["code"]) != expired_code for item in active_before_claim)

        admin = setup_helper.login_existing_user_api(
            settings.admin_email,
            settings.admin_password,
            evidence=scenario_artifacts,
            evidence_name="admin_login_api",
        )
        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin_expired_voucher")
        pages.admin.load()
        pages.admin.set_admin_token(admin_token)
        pages.admin.refresh()
        scenario_artifacts.save_screenshot("admin_expired_voucher.png", pages.driver)

        quota_create = services.voucher.create_admin(
            admin_token,
            voucher_payload(
                quota_code,
                discount_value=12000,
                quota_total=1,
                start_offset_days=-1,
                end_offset_days=7,
            ),
            evidence=scenario_artifacts,
            evidence_name="quota_one_voucher_create",
        )
        assert quota_create.status_code in {200, 201}

        buyer_one = setup_helper.register_user_api(
            setup_helper.new_user("quota-one-buyer"),
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_one_register",
        )
        product_one = setup_helper.choose_product(
            buyer_one.token,
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_one_product",
        )
        setup_helper.top_up_to_balance(
            buyer_one,
            product_one.price + Decimal("50000"),
            evidence=scenario_artifacts,
            prefix="quota_buyer_one_topup",
        )
        ui_logout_if_needed(pages)
        ui_login(pages, buyer_one.email, buyer_one.password, scenario_artifacts, "quota_buyer_one")
        pages.checkout.open(f"/checkout?productId={product_one.product_id}&qty=1")
        pages.checkout.wait_loaded()
        assert not pages.checkout.has_public_voucher(expired_code)
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.set_voucher_code(quota_code)
        pages.checkout.submit()
        pages.result.wait_loaded()
        first_order_id = pages.result.order_id()
        scenario_artifacts.save_screenshot("quota_voucher_first_use.png", pages.driver)

        buyer_two = setup_helper.register_user_api(
            setup_helper.new_user("quota-two-buyer"),
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_two_register",
        )
        product_two = setup_helper.choose_product(
            buyer_two.token,
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_two_product",
        )
        setup_helper.top_up_to_balance(
            buyer_two,
            product_two.price + Decimal("50000"),
            evidence=scenario_artifacts,
            prefix="quota_buyer_two_topup",
        )
        orders_before_second = services.order.list_my(
            buyer_two.token,
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_two_orders_before",
        ).payload["data"]

        ui_logout_if_needed(pages)
        ui_login(pages, buyer_two.email, buyer_two.password, scenario_artifacts, "quota_buyer_two")
        pages.checkout.open(f"/checkout?productId={product_two.product_id}&qty=1")
        pages.checkout.wait_loaded()
        public_codes_after_first = [normalize_code(item["code"]) for item in services.voucher.active(
            evidence=scenario_artifacts,
            evidence_name="active_vouchers_after_first_claim",
        ).payload]
        hidden_after_claim = quota_code not in public_codes_after_first
        if not hidden_after_claim:
            pages.checkout.set_voucher_code(quota_code)
        else:
            pages.checkout.set_voucher_code(quota_code)
            assert "not in the active voucher list" in pages.checkout.voucher_banner_text().lower()
        pages.checkout.set_shipping_address(settings.shipping_address)
        pages.checkout.submit()
        error_text = pages.checkout.error_text().lower()
        scenario_artifacts.save_screenshot("quota_voucher_second_rejected.png", pages.driver)
        assert any(fragment in error_text for fragment in ["quota", "voucher", "invalid", "inactive", "not found", "exhaust"])

        orders_after_second = services.order.list_my(
            buyer_two.token,
            evidence=scenario_artifacts,
            evidence_name="quota_buyer_two_orders_after",
        ).payload["data"]
        assert len(orders_after_second) == len(orders_before_second)

        details.update(
            {
                "admin_id": admin.user_id,
                "expired_voucher_code": expired_code,
                "quota_voucher_code": quota_code,
                "first_order_id": first_order_id,
                "public_codes_after_first_claim": public_codes_after_first,
                "quota_hidden_after_first_claim": hidden_after_claim,
                "second_error_text": error_text,
                "second_order_count_before": len(orders_before_second),
                "second_order_count_after": len(orders_after_second),
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
@pytest.mark.admin
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
        admin_token = require_admin_token(settings, "VOUCHER_ADMIN_TOKEN is required for the admin voucher scenario.")

        admin = setup_helper.login_existing_user_api(
            settings.admin_email,
            settings.admin_password,
            evidence=scenario_artifacts,
            evidence_name="admin_login_api",
        )

        ui_login(pages, admin.email, settings.admin_password, scenario_artifacts, "admin")
        pages.admin.load()
        pages.admin.set_admin_token(admin_token)
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
            admin_token,
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
