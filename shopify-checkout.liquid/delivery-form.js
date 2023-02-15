(function ($) {
    $(document).on("page:load page:change", function () {
        if (Shopify.Checkout.step === "shipping_method") {
            const shippingMethodsContainer = document.querySelector("fieldset[data-shipping-methods]");
            let shippingMethods = document.querySelectorAll("fieldset .content-box__row");
            const isDeliverToNeighbours = "{{ neighbours_checkbox }}";
            const neighboursExcludingMethod = "{{ neighbours_excluding_method }}";
            const regularShippingTitle = "{{ regular_shipping_method }}";
            const api_key = "{{ api_key }}";
            const deliveryDatesPeriod = "{{ delivety_dates_period }}";
            const deliveryDays = "{{ delivety_days_numbers }}"
            const deliveryHolidays = "{{ delivety_holidays }}"

            locationWorkingHours();

            if (regularShippingTitle && shippingMethods.length && deliveryDays) {
                const callback = (mutation, observer) => {
                    if (shippingMethods[0].classList.contains("selected")) {
                        deliveryDate();
                        observer.disconnect();
                    }
                };
                const observer = new MutationObserver(callback);
                observer.observe(shippingMethods[0], { attributes: true });
            }

            if (isDeliverToNeighbours) {
                deliveryToNeighbours();
            }

            function deliveryToNeighbours() {
                if (shippingMethods.length) {
                    updateElement(shippingMethods[0])
                }

                for (const shippingMethod of shippingMethods) {
                    shippingMethod.addEventListener('change', () => {
                        updateElement(shippingMethod)
                    });
                }

                function updateElement(shippingMethod) {
                    let excludingMethod = shippingMethod?.querySelector(`span[data-shipping-method-label-title="${neighboursExcludingMethod}"]`);
                    let checkboxContainer = document.createElement('div');
                    checkboxContainer.setAttribute('class', 'field checkbox-container delivery-to-neighbours');
                    let html = `
                          <div class="checkbox__input">
                              <input class="input-checkbox" type="checkbox" name="checkout[attributes][dontDeliverToNeighbours]" value="true">
                          </div>
                          <label class="checkbox__label">Do not deliver to neighbours</label>
                        `;
                    checkboxContainer.innerHTML = html;
                    let checkboxItem = document.querySelector(".delivery-to-neighbours");

                    !excludingMethod ?
                        addCheckbox() :
                        removeCheckbox();

                    function addCheckbox() {
                        if (!checkboxItem) {
                            shippingMethodsContainer.after(checkboxContainer);
                        }
                    }
                    function removeCheckbox() {
                        if (checkboxItem) {
                            checkboxItem.remove();
                        }
                    }
                }
            }

            function locationWorkingHours() {
                shippingMethodsContainer?.addEventListener('change', () => {
                    let currentLocationId = document.querySelector('[name="checkout[attributes][CODEPickupPoints.id]"]')?.value;
                    console.log("currentLocationId", currentLocationId)
                    if (currentLocationId) {
                        document.querySelector(".location-information")?.remove();
                        postNLRequest({ locationCode: currentLocationId, request: "location_working_hours" }).then((data) => {
                            if (data?.GetLocationsResult?.ResponseLocation?.OpeningHours) {
                                displayOpeningHours({ locationOpeningHours: data.GetLocationsResult.ResponseLocation.OpeningHours, currentLocationId: currentLocationId })
                            } else {
                                console.log("Error:", data)
                            }
                        });
                    }
                })

                function displayOpeningHours(params) {
                    console.log(params)
                    let html = "";
                    for (const [day, time] of Object.entries(params?.locationOpeningHours)) {
                        html += `<li>${day}: ${time.string}</li>`;
                    }
                    let selectedLocation = document.querySelector(`[data-pickup-points-id="${params.currentLocationId}"]`);
                    let dataList = document.createElement('ul');
                    dataList.setAttribute('class', 'location-information');
                    dataList.innerHTML = html;
                    selectedLocation.append(dataList)
                }

            }

            function deliveryDate() {
                let attributesInput = document.querySelector('input[name="checkout[attributes][deliveryDate]"]');
                if (!attributesInput) {
                    let input = document.createElement('input');
                    input.setAttribute('type', 'hidden');
                    input.setAttribute('name', 'checkout[attributes][deliveryDate]');
                    shippingMethodsContainer.append(input);
                    attributesInput = document.querySelector('input[name="checkout[attributes][deliveryDate]"]');
                }

                if (shippingMethods[0].classList.contains("selected")) {
                    calculateDeliveryDate(shippingMethods[0])
                }

                for (const shippingMethod of shippingMethods) {
                    shippingMethod.addEventListener('change', () => {
                        calculateDeliveryDate(shippingMethod)
                    });
                }

                function calculateDeliveryDate(shippingMethod) {
                    if (deliveryHolidays) {
                        const holidaysArr = deliveryHolidays.split(",");
                        moment.updateLocale('nl', {
                            holidays: holidaysArr,
                            holidayFormat: 'MM-DD'
                        });
                    }

                    const deliveryDaysArr = deliveryDays.split(",").map(Number);
                    moment.updateLocale('nl', { workingWeekdays: deliveryDaysArr });
                    const firstDay = moment().startOf('month');
                    const currentDay = moment();
                    const nextDayNumber = firstDay.businessDiff(currentDay);
                    const lastDayNumber = nextDayNumber + deliveryDatesPeriod;
                    const businessDays = firstDay.monthBusinessDays().slice(nextDayNumber, lastDayNumber);

                    const deliveryDates = businessDays.map(date => `<option class="delivery-date-options" value="${date.format("DD-MM-YYYY")}">${date.format('dddd MMMM Do')}</option>`);
                    let targetMethod = shippingMethod?.querySelector(`span[data-shipping-method-label-title="${regularShippingTitle}"]`);
                    console.log("targetMethod", targetMethod)
                    let timeFramesContainer = document.createElement('div');
                    timeFramesContainer.setAttribute('class', 'field field--show-floating-label timeframes-container');
                    let html = `
                            <div class="field__input-wrapper field__input-wrapper--select">
                                <label for="selectDeliveryDate" class="field__label field__label--visible">Select the desired delivery date:</label>
                                <select name="delivery-date" id="deliveryDateSelect" class="field__input field__input--select">
                                    ${deliveryDates}
                                </select>
                                <div class="field__caret">
                                    <svg class="icon-svg icon-svg--color-adaptive-lighter icon-svg--size-10 field__caret-svg" role="presentation" aria-hidden="true" focusable="false"> <use xlink:href="#caret-down"></use> </svg>
                                </div>
                            </div>
                        `;
                    timeFramesContainer.innerHTML = html;
                    let timeFramesItem = document.querySelector(".timeframes-container");

                    targetMethod ?
                        addTimeframes() :
                        removeTimeframes();

                    function addTimeframes() {
                        if (!timeFramesItem && deliveryDates?.length) {
                            shippingMethod.append(timeFramesContainer);

                            let deliveryDatesOption = document.querySelectorAll(".delivery-date-options");
                            if (deliveryDatesOption?.length) {
                                attributesInput.value = deliveryDatesOption[0].attributes.value.value;
                            }

                            document.querySelector("#deliveryDateSelect").addEventListener("change", (e) => {
                                let selectedDate = e.target[e.target.options.selectedIndex].value;
                                if (attributesInput && selectedDate) {
                                    attributesInput.value = selectedDate;
                                }
                            })
                        }
                    }
                    function removeTimeframes() {
                        timeFramesItem?.remove();
                        if (attributesInput)
                            attributesInput.value = "";
                    }
                }
            }

            async function postNLRequest(params) {
                const apiEndpoint = "https://api.postnl.nl/shipment";
                let data = {
                    LocationCode: params.locationCode,
                    RetailNetworkID: "PNPNL-01"
                }
                requestUrl = `${apiEndpoint}/v2_1/locations/lookup?`;
                for (let k in data) {
                    requestUrl += k + "=" + data[k] + "&";
                }
                requestUrl = encodeURI(requestUrl.slice(0, -1));
                const response = await fetch(requestUrl, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: api_key,
                    }
                });
                return response.json();
            }
        }
    });
})(Checkout.$);
