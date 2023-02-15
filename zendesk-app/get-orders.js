// -------------- //

Vue.prototype.$get_orders = async function (params) {
    let paginated_orders = [];

    if (!Array.isArray(params.order_ids)) {
        params.order_ids = params.order_ids.split(",");
    }

    params.order_ids.sort(function (a, b) {
        return b - a;
    });

    let page = params.page,
        page_size = 5,
        offset = (page - 1) * page_size;

    let paginated_ids = params.order_ids.slice(offset).slice(0, page_size),
        total_pages = Math.ceil(params.order_ids.length / page_size);

    let cusomer_orders = await this.$get_order(paginated_ids);

    if (cusomer_orders.response_code == 100) {
        cusomer_orders?.data
            ? (paginated_orders = JSON.parse(
                JSON.stringify([Object.values(cusomer_orders.data)][0])
            ))
            : (paginated_orders = [cusomer_orders]);

        if (!this.currency) {
            const gateway_view = await this.$gateway_view({
                gateway_id: paginated_orders[0].gateway_id,
            });

            if (gateway_view.response_code == 100) {
                this.currency = getCurrencySymbol(
                    this.currencies_list,
                    gateway_view.gateway_currency
                );
            }
        }

        paginated_orders.forEach((order) => {
            order.recurring = false;
            order.products.forEach((product) => {
                if (product.is_recurring == 1 || order.is_recurring == 1) {
                    order.recurring = true;
                }

                if (!order.hold_date && product.on_hold == 1) {
                    order.on_hold = 1;
                    order.hold_date = product.hold_date;
                }
            });
        });

        paginated_orders.sort((a, b) => {
            return b.order_id - a.order_id;
        });

        const response = {
            current_page: page,
            page_size: page_size,
            total: params.order_ids.length,
            total_pages: total_pages,
            currency_symbol: this.currency.currency_symbol,
            currency_code: this.currency.currency_code,
            data: paginated_orders,
        };
        return response;
    }
}

// ---------- //