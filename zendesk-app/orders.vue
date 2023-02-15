<template>
    <div>
        <div>
            <div class="data-container orders" v-if="customer_orders && customer_orders.data">
                <v-row align="center" class="container-heading">
                    <v-col cols="auto" ref="orders">
                        {{ translations.order_title }} ({{ customer_orders.total }})
                    </v-col>
                    <v-col>
                        <v-divider></v-divider>
                    </v-col>
                </v-row>
                <v-expansion-panels ref="expansion_panel_container" focusable v-if="customer_orders.data.length"
                    accordion>
                    <v-expansion-panel v-for="(order, i) in customer_orders.data" :key="i" outlined>
                        <v-expansion-panel-header disable-icon-rotate style="font-weight: bold" :hide-actions="true">
                            <v-row justify="space-between" align="center">
                                <v-col cols="auto" class="mr-0 pr-0 pl-0">
                                    <b>{{ customer_orders.currency_symbol }}{{ order.order_total }}
                                        ({{ customer_orders.currency_code }})</b>
                                    <template v-if="order.order_status == 2">
                                        <v-tooltip bottom>
                                            <template v-slot:activator="{ on, attrs }">
                                                <v-icon color="green" v-bind="attrs" v-on="on">mdi-credit-card-check
                                                </v-icon>
                                            </template>
                                            <span>{{ translations.order_status_approved }}</span>
                                        </v-tooltip>
                                    </template>
                                    <template v-if="order.order_status == 6">
                                        <v-tooltip bottom>
                                            <template v-slot:activator="{ on, attrs }">
                                                <v-icon color="orange" v-bind="attrs" v-on="on">mdi-credit-card-refund
                                                </v-icon>
                                            </template>
                                            <span>{{ translations.order_status_refunded }}</span>
                                        </v-tooltip>
                                    </template>
                                    <template v-if="order.order_status == 7">
                                        <v-tooltip bottom>
                                            <template v-slot:activator="{ on, attrs }">
                                                <v-icon color="red" v-bind="attrs" v-on="on">mdi-credit-card-off
                                                </v-icon>
                                            </template>
                                            <span>{{ translations.order_status_declined }}</span>
                                        </v-tooltip>
                                    </template>
                                </v-col>
                                <v-col cols="auto" class="mr-0 pr-0 pl-1">
                                    <v-btn x-small color="#3bb4e3" style="color: white"
                                        v-if="order.order_status != 6 && order.order_status != 7 && order.order_total != '0.00'"
                                        @click="refundOrder({ order_id: order.order_id, amount: order.order_total, refund_amount: order.refund_amount, keep_recurring: 0 })"
                                        @click.native.stop>
                                        {{ translations.order_button_refund }}</v-btn>
                                    <v-btn x-small color="#3bb4e3" style="color: white"
                                        v-if="order.order_status == 6 || order.order_status == 7 || order.order_total == '0.00'"
                                        disabled>
                                        {{ translations.order_button_refund }}</v-btn>
                                    <v-tooltip bottom v-if="order.recurring == true">
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn x-small color="#3bb4e3" style="color: white"
                                                @click="cancelOrder({ order_id: order.order_id, products: order.products })"
                                                @click.native.stop v-bind="attrs" v-on="on"
                                                @mouseenter="canBeCanceled(order.products)">
                                                {{ translations.order_button_cancel }}
                                            </v-btn>
                                        </template>
                                        <span v-if="subscriptions_to_cancel == 1">
                                            {{ translations.order_button_cancel }}
                                            {{ subscriptions_to_cancel }}
                                            {{ translations.order_product_subscription }}</span>
                                        <span v-if="subscriptions_to_cancel > 1">
                                            {{ translations.order_button_cancel }}
                                            {{ subscriptions_to_cancel }}
                                            {{ translations.order_product_subscriptions }}</span>
                                    </v-tooltip>
                                    <v-btn x-small color="grey darken-2" style="color: white"
                                        v-if="order.recurring == false" disabled>
                                        {{ translations.order_button_cancel }}
                                    </v-btn>
                                </v-col>
                                <div class="caption">
                                    <v-tooltip bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <div v-bind="attrs" v-on="on">
                                                {{ translations.order_paid }}: {{ getDate(order.acquisition_date) }}
                                            </div>
                                        </template>
                                        <span>{{ getFullDate(order.acquisition_date) }}</span>
                                    </v-tooltip>
                                    <div v-if="order.recurring == true">
                                        <div v-for="(product, i) in order.products" :key="i">
                                            <v-tooltip bottom>
                                                <template v-slot:activator="{ on, attrs }">
                                                    <div v-if="product.is_recurring != 0" v-bind="attrs" v-on="on">
                                                        {{ translations.order_next_charge }}:
                                                        {{ timeFromNow(product.recurring_date) }}
                                                        ({{ getDate(product.recurring_date) }})
                                                    </div>
                                                </template>
                                                <span>{{ getFullDate(product.recurring_date) }}</span>
                                            </v-tooltip>
                                        </div>
                                    </div>
                                    <div v-if="order.refund_date != ''">
                                        <v-tooltip bottom>
                                            <template v-slot:activator="{ on, attrs }">
                                                <div v-bind="attrs" v-on="on">
                                                    {{ translations.order_refunded_date }}:
                                                    {{ timeFromNow(order.refund_date) }}
                                                    ({{ getDate(order.refund_date) }})
                                                </div>
                                            </template>
                                            <span>{{ getFullDate(order.refund_date) }}</span>
                                        </v-tooltip>
                                    </div>
                                    <div v-if="order.void_date != ''">
                                        <v-tooltip bottom>
                                            <template v-slot:activator="{ on, attrs }">
                                                <div v-bind="attrs" v-on="on">
                                                    {{ translations.order_cancelled_date }}:
                                                    {{ timeFromNow(order.void_date) }}
                                                    ({{ getDate(order.void_date) }})
                                                </div>
                                            </template>
                                            <span>{{ getFullDate(order.void_date) }}</span>
                                        </v-tooltip>
                                    </div>

                                    <v-tooltip bottom v-if="order.on_hold == 1">
                                        <template v-slot:activator="{ on, attrs }">
                                            <div v-bind="attrs" v-on="on">
                                                {{ translations.order_hold_date }}: {{ timeFromNow(order.hold_date) }}
                                                ({{ getDate(order.hold_date) }})
                                            </div>
                                        </template>
                                        <span>{{ getFullDate(order.hold_date) }}</span>
                                    </v-tooltip>
                                </div>
                            </v-row>
                        </v-expansion-panel-header>
                        <v-expansion-panel-content>
                            <v-divider></v-divider>
                            <div class="caption">
                                {{ translations.order_products }}:
                                <div v-for="(product, i) in order.products" :key="i">
                                    <v-icon class="cart-icon">mdi-cart</v-icon>{{ product.name }}
                                    <i v-if="product.billing_model">({{ product.billing_model.name }})</i>
                                </div>
                            </div>
                        </v-expansion-panel-content>
                    </v-expansion-panel>
                </v-expansion-panels>
            </div>
            <paginate class="app-pagination" v-if="customer_orders && totalPages > 1" :page-count="totalPages"
                v-model="currentPage" :page-range="2" :click-handler="onPageChange" :prev-text="''" :next-text="''"
                :container-class="'v-pagination v-pagination--circle theme--light'"
                :page-link-class="'v-pagination__item'" :next-link-class="'v-pagination__navigation next'"
                :prev-link-class="'v-pagination__navigation prev'" :active-class="'v-pagination__item--active'">
            </paginate>
        </div>
    </div>
</template>

<script>
import moment from 'moment';

export default {
    props: ['customer_orders', 'translations', 'user_locale'],
    data: () => ({
        currentPage: 1,
        totalPages: 1,
        subscriptions_to_cancel: 0
    }),
    watch: {
        customer_orders: {
            deep: true,
            handler: function () {
                this.currentPage = this.customer_orders.current_page;
                this.totalPages = this.customer_orders.total_pages;
            }
        },
    },
    methods: {
        getDate(date) {
            moment.locale(this.user_locale)
            let yearNow = moment(Date.now()).format('YYYY');
            let orderYear = moment(date).format('YYYY')
            if (yearNow == orderYear) {
                return moment(date).format('MMMM Do')
            }
            return moment(date).format('MMMM Do YYYY')
        },
        getFullDate(date) {
            return moment(date).format('MMMM Do YYYY, h:mm:ss a')
        },
        timeFromNow(date) {
            moment.locale(this.user_locale)
            let result = moment(date).fromNow();
            return result.toLowerCase()[0].toUpperCase() +
                result.toLowerCase().slice(1)
        },
        cancelOrder: function (params) {
            this.$emit('cancelOrder', params)
        },
        refundOrder: function (params) {
            if (params.refund_amount != '0.00') {
                params.amount -= params.refund_amount;
                params.amount = +params.amount.toFixed(2);
            }
            this.$emit('refundOrder', params)
        },
        onPageChange(page) {
            this.$emit('onPageChange', { page: page });
            this.goto('orders');
        },
        goto(refName) {
            let element = this.$refs[refName];
            let top = element.offsetTop + 80;
            window.scrollTo({
                top: top,
                left: 0,
                behavior: 'smooth'
            });
        },
        canBeCanceled(products) {
            this.subscriptions_to_cancel = 0;
            products.forEach((product) => {
                if (product.next_subscription_product != "-") {
                    this.subscriptions_to_cancel += 1;
                }
            });
        }
    },
}
</script>
