import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const VOUCHER_API =
    import.meta.env.VITE_VOUCHER_BASE_URL || "http://18.232.174.224";

function cx(...classes) {
    return classes.filter(Boolean).join(" ");
}

function formatRp(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
    }).format(amount);
}

function formatDate(value) {
    try {
        return value ? new Date(value).toLocaleString() : "-";
    } catch {
        return "-";
    }
}

function normalizeVoucherCode(code) {
    return String(code || "").trim().toUpperCase();
}

async function fetchHealthData() {
    try {
        const response = await fetch(`${API}/actuator/health`);
        const data = await response.json();

        return {
            health: data?.status || (response.ok ? "UP" : "DOWN"),
            checkedAt: new Date(),
        };
    } catch {
        return {
            health: "DOWN",
            checkedAt: new Date(),
        };
    }
}

async function fetchOrdersData(userId, role) {
    try {
        const response = await fetch(`${API}/orders/my`, {
            headers: {
                "X-User-Id": String(userId),
                "X-Role": role,
            },
        });

        const data = await response.json();

        if (!response.ok || data?.success === false) {
            return {
                orders: [],
                error:
                    data?.error?.message || `Failed to fetch orders (${response.status})`,
            };
        }

        return {
            orders: Array.isArray(data.data) ? data.data : [],
            error: "",
        };
    } catch {
        return {
            orders: [],
            error: "Failed to fetch orders (network/CORS).",
        };
    }
}

async function fetchVoucherHealth() {
    try {
        const response = await fetch(`${VOUCHER_API}/health`);
        const data = await response.json();

        return {
            ok: response.ok,
            status: data?.status || "UNKNOWN",
            db: data?.db || "UNKNOWN",
        };
    } catch {
        return {
            ok: false,
            status: "DOWN",
            db: "DOWN",
        };
    }
}

async function claimVoucher({ code, orderId, orderAmount }) {
    const normalizedCode = normalizeVoucherCode(code);

    if (!normalizedCode) {
        return {
            success: false,
            message: "Voucher code kosong.",
        };
    }

    try {
        const response = await fetch(`${VOUCHER_API}/vouchers/claim`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code: normalizedCode,
                orderId: String(orderId),
                orderAmount: Number(orderAmount || 0),
            }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            return {
                success: false,
                message:
                    data?.message ||
                    data?.error ||
                    `Voucher claim failed (${response.status})`,
                raw: data,
            };
        }

        return {
            success: !!data?.success,
            idempotent: !!data?.idempotent,
            code: data?.code || normalizedCode,
            orderId: data?.orderId || String(orderId),
            orderAmount: Number(data?.orderAmount ?? orderAmount ?? 0),
            discountAmount: Number(data?.discountAmount ?? 0),
            discountType: data?.discountType || null,
            message: data?.success
                ? data?.idempotent
                    ? "Voucher sudah pernah di-claim untuk order ini (idempotent)."
                    : "Voucher berhasil di-claim."
                : data?.message || "Voucher claim gagal.",
            raw: data,
        };
    } catch {
        return {
            success: false,
            message: "Voucher claim failed (network/CORS).",
        };
    }
}

function Field({ label, children }) {
    return (
        <label className="flex flex-col w-full">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </span>
            {children}
        </label>
    );
}

export default function OrderPage() {
    const demoUserId = 1;
    const demoRole = "TITIPER";

    const [health, setHealth] = useState("loading...");
    const [lastChecked, setLastChecked] = useState(null);

    const [voucherServiceHealth, setVoucherServiceHealth] = useState("loading...");
    const [voucherDbHealth, setVoucherDbHealth] = useState("loading...");

    const [orders, setOrders] = useState([]);
    const [ordersMsg, setOrdersMsg] = useState("");

    const [checkout, setCheckout] = useState({
        productId: "2",
        qty: 1,
        address: "Jl. Mawar No. 1",
        voucherCode: "SPRING10",
    });

    const [voucherMsg, setVoucherMsg] = useState("");
    const [voucherClaimResult, setVoucherClaimResult] = useState(null);

    const [checkoutMsg, setCheckoutMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const healthTone = useMemo(() => {
        if (health === "UP") {
            return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
        }
        if (health === "loading...") {
            return "border-white/10 bg-white/5 text-white/70";
        }
        return "border-red-400/20 bg-red-400/10 text-red-200";
    }, [health]);

    const voucherHealthTone = useMemo(() => {
        if (voucherServiceHealth === "UP") {
            return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
        }
        if (voucherServiceHealth === "loading...") {
            return "border-white/10 bg-white/5 text-white/70";
        }
        return "border-red-400/20 bg-red-400/10 text-red-200";
    }, [voucherServiceHealth]);

    async function refreshHealth() {
        const result = await fetchHealthData();
        setHealth(result.health);
        setLastChecked(result.checkedAt);

        const voucherHealth = await fetchVoucherHealth();
        setVoucherServiceHealth(voucherHealth.status);
        setVoucherDbHealth(voucherHealth.db);
    }

    async function refreshOrders() {
        setOrdersMsg("");
        const result = await fetchOrdersData(demoUserId, demoRole);
        setOrders(result.orders);
        setOrdersMsg(result.error);
    }

    async function handleRefresh() {
        await refreshHealth();
        await refreshOrders();
    }

    async function submitCheckout(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setCheckoutMsg("Submitting...");
        setVoucherMsg("");
        setVoucherClaimResult(null);

        if (!checkout.address.trim()) {
            setCheckoutMsg("Alamat tidak boleh kosong.");
            setIsSubmitting(false);
            return;
        }

        if (!checkout.productId || Number(checkout.qty) <= 0) {
            setCheckoutMsg("Product ID dan quantity harus valid.");
            setIsSubmitting(false);
            return;
        }

        const normalizedVoucherCode = normalizeVoucherCode(checkout.voucherCode);

        const body = {
            address: checkout.address,
            voucherCode: normalizedVoucherCode || null,
            items: [
                {
                    productId: Number(checkout.productId),
                    qty: Number(checkout.qty),
                },
            ],
        };

        try {
            const response = await fetch(`${API}/orders/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Id": String(demoUserId),
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || data?.success === false) {
                setCheckoutMsg(
                    data?.error?.message || `Checkout failed (${response.status})`
                );
                setIsSubmitting(false);
                return;
            }

            const created = data.data;
            const createdOrderId = created?.id ?? "-";
            const createdOrderStatus = created?.status ?? "PENDING";
            const createdOrderAmount =
                Number(created?.totalPaid ?? created?.totalAmount ?? 0) || 0;

            let finalMessage = `✅ Order berhasil dibuat. ID: ${createdOrderId} | Status: ${createdOrderStatus}`;

            if (normalizedVoucherCode) {
                const voucherResult = await claimVoucher({
                    code: normalizedVoucherCode,
                    orderId: createdOrderId,
                    orderAmount: createdOrderAmount,
                });

                setVoucherClaimResult(voucherResult);

                if (voucherResult.success) {
                    setVoucherMsg(
                        voucherResult.idempotent
                            ? `ℹ️ Voucher ${voucherResult.code} sudah pernah dipakai untuk order ${voucherResult.orderId}.`
                            : `✅ Voucher ${voucherResult.code} berhasil di-claim untuk order ${voucherResult.orderId}.`
                    );

                    finalMessage += voucherResult.idempotent
                        ? " | Voucher: already claimed (idempotent)"
                        : " | Voucher: claimed";
                } else {
                    setVoucherMsg(`❌ ${voucherResult.message}`);
                    finalMessage += " | Voucher: claim failed";
                }
            }

            setCheckoutMsg(finalMessage);

            await refreshOrders();
            await refreshHealth();
        } catch {
            setCheckoutMsg("Checkout failed (network/CORS).");
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        let ignore = false;

        async function loadInitialData() {
            const [healthResult, ordersResult, voucherHealth] = await Promise.all([
                fetchHealthData(),
                fetchOrdersData(demoUserId, demoRole),
                fetchVoucherHealth(),
            ]);

            if (ignore) return;

            setHealth(healthResult.health);
            setLastChecked(healthResult.checkedAt);

            setOrders(ordersResult.orders);
            setOrdersMsg(ordersResult.error);

            setVoucherServiceHealth(voucherHealth.status);
            setVoucherDbHealth(voucherHealth.db);
        }

        loadInitialData();

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 font-display antialiased overflow-x-hidden">
            <div className="relative flex min-h-screen w-full flex-col">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute left-1/2 top-[-160px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute left-[-60px] top-[280px] h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="absolute bottom-[-100px] right-[-60px] h-[320px] w-[320px] rounded-full bg-fuchsia-500/10 blur-3xl" />
                </div>

                <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-6 relative z-10">
                    <div className="flex flex-col w-full max-w-[1100px]">
                        <header className="flex items-center justify-between border-b border-slate-200 dark:border-primary/20 px-4 md:px-6 py-4 mb-8">
                            <div className="flex items-center gap-4 text-primary">
                <span className="material-symbols-outlined !text-2xl">
                  shopping_bag
                </span>
                                <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                                    ORDER
                                </h2>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap justify-end">
                <span
                    className={cx(
                        "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider",
                        healthTone
                    )}
                >
                  Order Health: {health}
                </span>

                                <span
                                    className={cx(
                                        "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider",
                                        voucherHealthTone
                                    )}
                                >
                  Voucher Health: {voucherServiceHealth}
                </span>

                                <button
                                    onClick={handleRefresh}
                                    className="rounded-full bg-primary hover:bg-primary/90 text-white px-5 py-2 text-sm font-bold transition-colors"
                                >
                                    Refresh
                                </button>
                            </div>
                        </header>

                        <div className="px-2 md:px-4 flex flex-col gap-8 pb-16">
                            <div className="flex flex-wrap justify-between gap-3 items-end">
                                <div>
                                    <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight">
                                        Checkout + Voucher Claim
                                    </h1>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        Order dibuat dulu, lalu voucher di-claim ke service voucher
                                        menggunakan orderId dan orderAmount.
                                    </p>
                                </div>

                                <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                                    Voucher API: {VOUCHER_API}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 flex flex-col gap-8">
                                    <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-primary">
                        local_shipping
                      </span>
                                            <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                                                1. Shipping Address
                                            </h2>
                                        </div>

                                        <Field label="Full Address">
                      <textarea
                          className="form-input flex w-full resize-none overflow-hidden rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-primary/30 bg-transparent min-h-[120px] placeholder:text-slate-400 dark:placeholder:text-slate-500 p-4 text-base font-normal transition-all"
                          placeholder="Enter your shipping address..."
                          value={checkout.address}
                          onChange={(e) =>
                              setCheckout((prev) => ({
                                  ...prev,
                                  address: e.target.value,
                              }))
                          }
                      />
                                        </Field>
                                    </section>

                                    <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-primary">
                        shopping_bag
                      </span>
                                            <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                                                2. Order Items
                                            </h2>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-primary/10 border border-slate-100 dark:border-primary/10">
                                                <div className="size-20 md:size-24 shrink-0 rounded-lg bg-gradient-to-br from-primary/40 to-blue-500/40" />
                                                <div className="flex flex-col flex-1 gap-3">
                                                    <Field label="Product ID">
                                                        <input
                                                            type="number"
                                                            className="form-input rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-primary/30 bg-transparent px-4 py-3 text-sm transition-all"
                                                            value={checkout.productId}
                                                            onChange={(e) =>
                                                                setCheckout((prev) => ({
                                                                    ...prev,
                                                                    productId: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </Field>

                                                    <Field label="Quantity">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            className="form-input rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-primary/30 bg-transparent px-4 py-3 text-sm transition-all"
                                                            value={checkout.qty}
                                                            onChange={(e) =>
                                                                setCheckout((prev) => ({
                                                                    ...prev,
                                                                    qty: Number(e.target.value),
                                                                }))
                                                            }
                                                        />
                                                    </Field>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl p-6">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
                                            Voucher Code
                                        </h3>

                                        <input
                                            className="form-input w-full rounded-xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-primary/30 bg-transparent px-4 py-3 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                                            placeholder="SPRING10"
                                            type="text"
                                            value={checkout.voucherCode}
                                            onChange={(e) =>
                                                setCheckout((prev) => ({
                                                    ...prev,
                                                    voucherCode: e.target.value.toUpperCase(),
                                                }))
                                            }
                                        />

                                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                            Voucher akan di-claim otomatis setelah order berhasil dibuat.
                                            Server voucher akan normalisasi code dengan trim + uppercase.
                                        </p>

                                        {voucherMsg && (
                                            <div className="mt-4 rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-primary/10 p-4 text-sm text-slate-700 dark:text-slate-200">
                                                {voucherMsg}
                                            </div>
                                        )}
                                    </section>

                                    <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl p-6 flex flex-col gap-6">
                                        <div className="flex flex-col gap-3">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                                                Order Summary
                                            </h3>

                                            <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          Product ID
                        </span>
                                                <span className="font-medium text-slate-900 dark:text-white">
                          {checkout.productId || "-"}
                        </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          Quantity
                        </span>
                                                <span className="font-medium text-slate-900 dark:text-white">
                          {checkout.qty}
                        </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          Voucher
                        </span>
                                                <span className="font-medium text-primary">
                          {normalizeVoucherCode(checkout.voucherCode) || "-"}
                        </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          Voucher Service DB
                        </span>
                                                <span className="font-medium text-slate-900 dark:text-white">
                          {voucherDbHealth}
                        </span>
                                            </div>

                                            <div className="h-px w-full bg-slate-200 dark:bg-primary/20 my-2" />

                                            <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">
                          Total
                        </span>
                                                <span className="font-bold text-primary text-xl">
                          Dihitung backend
                        </span>
                                            </div>
                                        </div>

                                        <form onSubmit={submitCheckout}>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className={cx(
                                                    "w-full py-3 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all",
                                                    isSubmitting
                                                        ? "bg-primary/50 text-white/70 cursor-not-allowed"
                                                        : "bg-primary hover:bg-primary/90 text-white"
                                                )}
                                            >
                        <span className="material-symbols-outlined text-lg leading-none">
                          shopping_cart_checkout
                        </span>
                                                <span>
                          {isSubmitting ? "Submitting..." : "Create Order + Claim Voucher"}
                        </span>
                                            </button>
                                        </form>

                                        {checkoutMsg && (
                                            <div className="rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-primary/10 p-4 text-sm text-slate-700 dark:text-slate-200">
                                                {checkoutMsg}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </div>

                            {voucherClaimResult && (
                                <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl p-6">
                                    <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                                        Voucher Claim Result
                                    </h2>

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Success</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {String(voucherClaimResult.success)}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Idempotent</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {String(voucherClaimResult.idempotent ?? false)}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Code</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {voucherClaimResult.code || "-"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Order ID</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {voucherClaimResult.orderId || "-"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Order Amount</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {formatRp(voucherClaimResult.orderAmount || 0)}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
                                            <div className="text-slate-500 dark:text-slate-400">Discount Amount</div>
                                            <div className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {formatRp(voucherClaimResult.discountAmount || 0)}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-2xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-200 dark:border-primary/20">
                                    <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                                        My Orders
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                        Tabel ini menampilkan order setelah checkout berhasil.
                                    </p>
                                </div>

                                {ordersMsg && (
                                    <div className="mx-6 mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                                        {ordersMsg}
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-100/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-bold uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th className="px-6 py-4 text-left font-bold uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-left font-bold uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-6 py-4 text-left font-bold uppercase tracking-wider">
                                                Created At
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                                                >
                                                    Belum ada order. Silakan checkout terlebih dahulu.
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    className="hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                                                        #{order.id}
                                                    </td>
                                                    <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  {order.status || "PENDING"}
                              </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-900 dark:text-white">
                                                        {formatRp(order.totalPaid)}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                        {formatDate(order.createdAt)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                    Last checked: {lastChecked ? lastChecked.toLocaleString() : "-"}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}