from __future__ import annotations

from dataclasses import dataclass

from .clients import AuthClient, InventoryClient, OrderClient, VoucherClient, WalletClient


@dataclass(frozen=True)
class ServiceBundle:
    auth: AuthClient
    inventory: InventoryClient
    wallet: WalletClient
    order: OrderClient
    voucher: VoucherClient


def build_services(settings) -> ServiceBundle:
    return ServiceBundle(
        auth=AuthClient(settings.auth_base_url),
        inventory=InventoryClient(settings.inventory_base_url),
        wallet=WalletClient(settings.wallet_base_url),
        order=OrderClient(settings.order_base_url),
        voucher=VoucherClient(settings.voucher_base_url),
    )
