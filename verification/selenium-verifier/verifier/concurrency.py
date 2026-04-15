from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from decimal import Decimal
from threading import Event
from typing import Any, Callable

from .models import ConcurrencyOutcome
from .verdicts import FAILED, PARTIALLY_VERIFIED, VERIFIED


class ConcurrencyVerifier:
    def __init__(self, settings, services, setup_helper, artifact_manager) -> None:
        self.settings = settings
        self.services = services
        self.setup_helper = setup_helper
        self.artifact_manager = artifact_manager

    def run_all(self) -> list[ConcurrencyOutcome]:
        self.settings.require("internal_api_token")
        outcomes = [
            self.verify_inventory(),
            self.verify_wallet(),
            self.verify_voucher(),
        ]
        return outcomes

    def verify_inventory(self) -> ConcurrencyOutcome:
        scenario = self.artifact_manager.scenario("concurrency_inventory")
        worker_count = self.settings.concurrency_workers
        user = self.setup_helper.register_user_api(self.setup_helper.new_user("cc-inventory"))
        product = self.setup_helper.choose_product(user.token)
        product_id = self.settings.concurrency_product_id or product.product_id

        before = self.services.inventory.get_inventory_internal(
            product_id,
            self.settings.internal_api_token,
            evidence=scenario,
            evidence_name="before_inventory",
        ).payload

        def call(_: int):
            response = self.services.inventory.reduce_stock_internal(
                product_id,
                1,
                self.settings.internal_api_token,
            )
            return response.status_code, response.payload

        results = self._run_concurrent(worker_count, call)
        success_count = sum(1 for status, _ in results if status == 200)
        conflict_count = sum(1 for status, _ in results if status == 409)
        error_count = sum(1 for status, _ in results if status == "exception")

        after = self.services.inventory.get_inventory_internal(
            product_id,
            self.settings.internal_api_token,
            evidence=scenario,
            evidence_name="after_inventory",
        ).payload

        if success_count > 0:
            self.services.inventory.restore_stock_internal(
                product_id,
                success_count,
                self.settings.internal_api_token,
                evidence=scenario,
                evidence_name="restore_inventory",
            )
        restored = self.services.inventory.get_inventory_internal(
            product_id,
            self.settings.internal_api_token,
            evidence=scenario,
            evidence_name="restored_inventory",
        ).payload

        verdict = VERIFIED
        if int(after["stock"]) < 0 or int(restored["stock"]) != int(before["stock"]):
            verdict = FAILED
        elif error_count > 0:
            verdict = PARTIALLY_VERIFIED

        outcome = ConcurrencyOutcome(
            name="inventory",
            verdict=verdict,
            worker_count=worker_count,
            before=before,
            after={"after_test": after, "after_restore": restored},
            result_counts={"success": success_count, "conflict": conflict_count, "exception": error_count},
            limitations=[
                "Live deployed service verification.",
                "Service-level stock mutation test, not full cross-service orchestration.",
            ],
        )
        scenario.write_json("outcome.json", outcome)
        return outcome

    def verify_wallet(self) -> ConcurrencyOutcome:
        scenario = self.artifact_manager.scenario("concurrency_wallet")
        worker_count = self.settings.concurrency_workers
        per_request_amount = Decimal("10000")
        seeded_balance = Decimal("100000")

        user = self.setup_helper.register_user_api(self.setup_helper.new_user("cc-wallet"))
        self.setup_helper.top_up_to_balance(user, seeded_balance, evidence=scenario, prefix="seed_wallet")
        before = self.services.wallet.get_balance(
            user.user_id,
            token=user.token,
            evidence=scenario,
            evidence_name="before_wallet",
        ).payload

        order_ids: list[int] = []

        def call(index: int):
            order_id = 900000 + index
            response = self.services.wallet.deduct(
                user.user_id,
                order_id,
                per_request_amount,
                self.settings.internal_api_token,
            )
            if response.status_code == 200:
                order_ids.append(order_id)
            return response.status_code, response.payload, order_id

        results = self._run_concurrent(worker_count, call)
        success_ids = [result[2] for result in results if result[0] == 200]
        conflict_count = sum(1 for result in results if result[0] == 409)
        success_count = len(success_ids)
        error_count = sum(1 for result in results if result[0] == "exception")

        after = self.services.wallet.get_balance(
            user.user_id,
            token=user.token,
            evidence=scenario,
            evidence_name="after_wallet",
        ).payload

        for order_id in success_ids:
            self.services.wallet.refund(
                user.user_id,
                order_id,
                per_request_amount,
                self.settings.internal_api_token,
            )

        restored = self.services.wallet.get_balance(
            user.user_id,
            token=user.token,
            evidence=scenario,
            evidence_name="restored_wallet",
        ).payload

        verdict = VERIFIED
        expected_after = Decimal(str(before["balance"])) - (per_request_amount * success_count)
        if Decimal(str(after["balance"])) < 0 or Decimal(str(after["balance"])) != expected_after:
            verdict = FAILED
        elif Decimal(str(restored["balance"])) != Decimal(str(before["balance"])):
            verdict = FAILED
        elif error_count > 0:
            verdict = PARTIALLY_VERIFIED

        outcome = ConcurrencyOutcome(
            name="wallet",
            verdict=verdict,
            worker_count=worker_count,
            before=before,
            after={"after_test": after, "after_restore": restored},
            result_counts={"success": success_count, "conflict": conflict_count, "exception": error_count},
            limitations=[
                "Live deployed service verification.",
                "Service-level wallet deduction test, not full cross-service orchestration.",
            ],
        )
        scenario.write_json("outcome.json", outcome)
        return outcome

    def verify_voucher(self) -> ConcurrencyOutcome:
        scenario = self.artifact_manager.scenario("concurrency_voucher")
        worker_count = self.settings.concurrency_workers
        if not self.settings.voucher_admin_token:
            raise RuntimeError("VOUCHER_ADMIN_TOKEN is required for voucher concurrency verification.")

        user = self.setup_helper.register_user_api(self.setup_helper.new_user("cc-voucher"))
        now = datetime.utcnow()
        code = f"CC{now.strftime('%H%M%S%f')}"
        created = self.services.voucher.create_admin(
            self.settings.voucher_admin_token,
            {
                "code": code,
                "discountType": "FIXED",
                "discountValue": 10000.00,
                "startAt": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
                "endAt": (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S"),
                "minSpend": 0.00,
                "quotaTotal": 7,
            },
            evidence=scenario,
            evidence_name="created_voucher",
        ).payload

        def call(index: int):
            response = self.services.voucher.claim(
                code,
                str(800000 + index),
                100000,
                user.user_id,
                self.settings.internal_api_token,
            )
            return response.status_code, response.payload

        results = self._run_concurrent(worker_count, call)
        success_count = sum(1 for result in results if result[0] != "exception" and result[1].get("success") is True)
        failure_count = sum(
            1 for result in results if result[0] != "exception" and result[1].get("success") is not True
        )
        error_count = sum(1 for result in results if result[0] == "exception")

        admin_list = self.services.voucher.list_admin(
            self.settings.voucher_admin_token,
            evidence=scenario,
            evidence_name="admin_list_after",
        ).payload
        after = next(item for item in admin_list if item["code"] == code)

        verdict = VERIFIED
        expected_remaining = int(created["quotaRemaining"]) - success_count
        if success_count == 0:
            verdict = FAILED
        elif int(after["quotaRemaining"]) < 0 or int(after["quotaRemaining"]) != expected_remaining:
            verdict = FAILED
        elif error_count > 0:
            verdict = PARTIALLY_VERIFIED

        outcome = ConcurrencyOutcome(
            name="voucher",
            verdict=verdict,
            worker_count=worker_count,
            before=created,
            after=after,
            result_counts={"success": success_count, "failure": failure_count, "exception": error_count},
            limitations=[
                "Live deployed service verification.",
                "Service-level voucher claim test, not full cross-service orchestration.",
            ],
        )
        scenario.write_json("outcome.json", outcome)
        return outcome

    def _run_concurrent(self, worker_count: int, fn: Callable[[int], Any]) -> list[Any]:
        start_event = Event()
        futures = []

        def wrapper(index: int):
            start_event.wait()
            return fn(index)

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            for index in range(worker_count):
                futures.append(executor.submit(wrapper, index))
            start_event.set()
            results = []
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as error:  # noqa: BLE001
                    results.append(("exception", {"error": str(error)}))
            return results
