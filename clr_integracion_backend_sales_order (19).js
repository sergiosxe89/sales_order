var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../../clr_integracion_backend_async", "../integracion clientes/clr_integracion_backend_customer", "N/https", "N/search", "N/record", "N/log", "N/format", "../../clr_integracion_backend_errors", "N/runtime"], factory);
    }
})(function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.customerSalesOrder = void 0;
    var clr_integracion_backend_async_1 = require("../../clr_integracion_backend_async");
    var clr_integracion_backend_customer_1 = require("../integracion clientes/clr_integracion_backend_customer");
    var https_1 = require("N/https");
    var search_1 = require("N/search");
    var record_1 = require("N/record");
    var log_1 = require("N/log");
    var format_1 = require("N/format");
    var clr_integracion_backend_errors_1 = require("../../clr_integracion_backend_errors");
    var runtime_1 = require("N/runtime");
    /**
     * Action file
     *
     * WARNING:
     * TypeScript generated file, do not edit directly
     * source files are located in the the repository
     *
     * @project: Integracion Backend
     * @description: Refactorizacionde integracion de ordenes de venta
     *
     * @copyright 07/25/2022 Laika
     * @author Maiky Sanchez maiky.sanchez@cloudriver.tech
     */
    /** Sales Order Action */
    var customerSalesOrder = /** @class */ (function (_super) {
        __extends(customerSalesOrder, _super);
        /** Class Constructor */
        function customerSalesOrder(params) {
            return _super.call(this, params) || this;
        }
        customerSalesOrder.prototype.assingEndpoint = function (subsidiaryEnd) {
            // set where the callback is going
            switch (runtime_1.envType) {
                case runtime_1.EnvType.PRODUCTION:
                    if (Number(subsidiaryEnd) == 9)
                        this.setResponseUri("https://lk-apinetsuite.laika.com.co/api/webHub");
                    break;
                /*case EnvType.SANDBOX:
                case EnvType.BETA:
                case EnvType.INTERNAL:
                    //this.setResponseUri("https://eox9e0h4bcfkf5u.m.pipedream.net");
                    if(Number(subsidiaryEnd) == 9)
                        this.setResponseUri("https://lkstg-apinetsuite.laika.com.co/api/webHub");
                    break;*/
                default:
                    this.setResponseUri("https://eox9e0h4bcfkf5u.m.pipedream.net");
            }
        };
        customerSalesOrder.prototype.getProcessor = function (params) {
            var invoiceReturn = "";
            try {
                var ovSearch = (0, search_1.create)({
                    type: "customrecord_ft_lk_ordven__id",
                    columns: ["custrecord_ft_lk_faccre_id"],
                    filters: [["name", "IS", params.idSalesOrder]]
                }).run();
                var count = 0;
                var pageSize = 800;
                var start = 0;
                do {
                    var firstResult = ovSearch.getRange({ start: start, end: start + pageSize });
                    invoiceReturn = firstResult[0].getValue(ovSearch.columns[0]);
                    count = firstResult.length;
                    start += pageSize;
                } while (count == pageSize);
                this.setProcessingData({
                    invoice: invoiceReturn
                });
            }
            catch (e) {
                this.setError("".concat(clr_integracion_backend_errors_1.Errors.SLO_METHOD_GET, " ").concat(e.message));
            }
        };
        customerSalesOrder.prototype.postValidator = function (params) {

        
          if (!params.customer || !params.customer.isperson || !params.customer.firstName ||
                !params.customer.surName || !params.customer.email || !params.customer.laikaID ||
                !params.subsidiary || !params.items || params.items.length === 0)
                return this.setError(clr_integracion_backend_errors_1.Errors.RL_BAD_BODY);
          
            this.createTask(https_1.Method.POST, params);
        };
        customerSalesOrder.prototype.postProcessor = function (params) {
            try {
                (0, log_1.audit)("params postProcessor Sales Order", params);
                this.assingEndpoint(params.subsidiary);
                if (!params.hasOwnProperty("sendToBack")) {
                    params.sendToBack = "F";
                }
                else {
                    if (!params.sendToBack) {
                        params.sendToBack = "F";
                    }
                }
                if (params.sendToBack == "F") {
                    if (Number(params.subsidiary) === 9) { // validacion temporal para el funcionamiento solo en mexico
                        var customer = new clr_integracion_backend_customer_1.customerIntegration(params.customer);
                        var registerCustomer = customer.registerCustomer(params.customer);
                        if (registerCustomer.response != "Error") {
                            params.customer.internalid = registerCustomer.response;
                            params.customer.addressLabelId = registerCustomer.addressLabelId;
                            if (Number(params.customer.subsidiary) === 9) {
                                this.createOrUpdateSalesOrder(params);
                                (0, log_1.audit)({ title: "Update successful", details: params });
                                if (this.hasError())
                                    return;
                                (0, log_1.audit)({ title: "Id Sales Order", details: params.recordId }); // Maiky
                                if (params.recordId) {
                                    (0, log_1.audit)({ title: "Update successful", details: params });
                                    this.TransactionStatusAPV(params);
                                    var statusSalesOrder1 = (0, search_1.lookupFields)({
                                        type: search_1.Type.SALES_ORDER,
                                        id: params.recordId,
                                        columns: ["status"]
                                    });
                                    (0, log_1.audit)("Response Medium 1: ", {
                                        customer: params.customer.internalid,
                                        salesOrder: params.recordId,
                                        statusSalesOrder: statusSalesOrder1.status[0].value
                                    });
                                    if (statusSalesOrder1.status[0].value != "pendingBilling")
                                        this.TransactionStatusFFD(params);
                                    var statusSalesOrder2 = (0, search_1.lookupFields)({
                                        type: search_1.Type.SALES_ORDER,
                                        id: params.recordId,
                                        columns: ["status"]
                                    });
                                    (0, log_1.audit)("Response Medium 2: ", {
                                        customer: params.customer.internalid,
                                        salesOrder: params.recordId,
                                        statusSalesOrder: statusSalesOrder2.status[0].value
                                    });
                                    // TODO se necesita validar status
                                    if (statusSalesOrder2.status[0].value != "pendingBilling") {
                                        var messageError = "No se puede realizar la facturacion el stock es insuficiente, el estado de la Orden de Venta: " + statusSalesOrder2.status[0].text;
                                        this.setError(clr_integracion_backend_errors_1.Errors.SLO_DIFERENT_PENDING_BILLING, {
                                            errorDetail: messageError,
                                            customer: params.customer.internalid,
                                            salesOrder: params.recordId ? params.recordId : ""
                                        });
                                        (0, record_1.submitFields)({
                                            type: "salesorder",
                                            id: params.recordId,
                                            values: { "custbody_cr_status_billing_sales_order": messageError }
                                        });
                                        if (this.hasError())
                                            return;
                                    }
                                    // creacion de factura de venta
                                    params.invoiceId = this.createInvoice(params);
                                    var ordVen = (0, record_1.create)({
                                        type: "customrecord_ft_lk_ordven__id",
                                        isDynamic: true
                                    }); //  Almacenado de los datos en un registro personalizado
                                    ordVen.setValue({ fieldId: "name", value: params.recordId });
                                    // TODO recordId o params.recordId ???
                                    ordVen.setValue({
                                        fieldId: "custrecord_ft_lk_faccre_id",
                                        value: params.recordId
                                    });
                                    ordVen.save({ enableSourcing: false, ignoreMandatoryFields: true });
                                }
                                (0, log_1.audit)("Response Finish: ", {
                                    customer: params.customer.internalid,
                                    salesOrder: params.recordId,
                                    invoice: params.invoiceId
                                });
                                this.setProcessingData({
                                    customer: params.customer.internalid,
                                    salesOrder: params.recordId ? params.recordId : "",
                                    invoice: params.invoiceId ? params.invoiceId : ""
                                });
                            }
                            else {
                                this.setError(clr_integracion_backend_errors_1.Errors.CSTM_SUBSIDARY_DIFFERENT_MEXICO, {
                                    customer: params.customer.internalid ? params.customer.internalid : ""
                                });
                            }
                            return;
                        }
                        else {
                            this.setError(clr_integracion_backend_errors_1.Errors.CSTM_REGISTER_CUSTOMER, {
                                customer: params.customer.internalid ? params.customer.internalid : "",
                                errorDetail: registerCustomer.error
                            });
                        }
                    }
                    else {
                        this.setError(clr_integracion_backend_errors_1.Errors.SLO_SUBSIDARY_DIFFERENT_MEXICO, {
                            customer: params.customer.internalid ? params.customer.internalid : ""
                        });
                    }
                }
            }
            catch (e) {
                (0, log_1.error)("Error Post ", e);
                (0, log_1.error)("Error Post stack ", e.stack);
                this.setError(clr_integracion_backend_errors_1.Errors.SLO_METHOD_POST, {
                    errorDetail: e.message,
                    customer: params.customer.internalid ? params.customer.internalid : "",
                    salesOrder: params.recordId ? params.recordId : ""
                });
            }
        };
        customerSalesOrder.prototype.putValidator = function (params) {

          log.error("sales_ord:putValidator", params);
          
            if (params._action_invoice) {
                this.createTask(https_1.Method.PUT, params);
            }
            else if (!params.subsidiary || !params.internalId || !params.orderLaika ||
                params.items.length === 0 || (params.customer && !params.customer.laikaID)) {
                return this.setError(clr_integracion_backend_errors_1.Errors.RL_BAD_BODY);
            }
            else {
                this.createTask(https_1.Method.PUT, params);
            }
        };
        customerSalesOrder.prototype.putProcessor = function (params) {
            try {
                if (params.checkPago == "T")
                    params.status = "FULFILLMENT";
                var recordId_1 = null;
                var subsidarySalesOrder = (0, search_1.lookupFields)({
                    type: search_1.Type.SALES_ORDER,
                    id: params.internalId,
                    columns: "subsidiary"
                }).subsidiary[0].value;
                this.assingEndpoint(subsidarySalesOrder);
                if (!params.hasOwnProperty("sendToBack")) {
                    params.sendToBack = "F";
                }
                else {
                    if (!params.sendToBack) {
                        params.sendToBack = "F";
                    }
                }
                if (params.sendToBack == "F") {
                    if (!params._action_invoice) {
                        (0, search_1.create)({
                            type: search_1.Type.SALES_ORDER,
                            filters: [
                                ["custbody_id_laika", "equalto", params.orderLaika], "AND",
                                ["status", "noneof", ["SalesOrd:C", "SalesOrd:H"]], "AND",
                                ["subsidiary", "anyof", params.subsidiary], "AND",
                                ["mainline", "is", true]
                            ],
                            columns: ["internalid"],
                        }).run().each(function (result) {
                            recordId_1 = result.getValue({ name: "internalid" });
                            return false;
                        });
                        if (Number(params.subsidiary) === 9) { // validacion temporal para el funcionamiento solo en mexico
                            if (params.customer) {
                                var customer = new clr_integracion_backend_customer_1.customerIntegration(params.customer);
                                customer.registerCustomer(params.customer);
                            }
                            if (!recordId_1) {
                                var idTransaction = this.createOrUpdateSalesOrder(params);
                                if (this.hasError())
                                    return;
                                if (params.trnCode) {
                                    this.statusTransactionProccess(params);
                                }
                                var objResponse = {};
                                objResponse.customer = params.customer.internalid;
                                objResponse.salesOrder = idTransaction;
                                if (params._action_invoice) {
                                    var statusSalesOrder = (0, search_1.lookupFields)({
                                        type: search_1.Type.SALES_ORDER,
                                        id: params.internalId,
                                        columns: ["status"]
                                    });
                                    if (statusSalesOrder.status[0].value != "pendingBilling") {
                                        var messageError = "No se puede realizar la facturacion, el estado de la Orden de Venta es: " + statusSalesOrder.status[0].text;
                                        this.setError(clr_integracion_backend_errors_1.Errors.SLO_DIFERENT_PENDING_BILLING, {
                                            errorDetail: messageError
                                        });
                                        (0, record_1.submitFields)({
                                            type: "salesorder",
                                            id: params.internalId,
                                            values: { "custbody_cr_status_billing_sales_order": messageError }
                                        });
                                        if (this.hasError())
                                            return;
                                    }
                                    var invoiceUpdate = this.createInvoice(params);
                                    if (this.hasError())
                                        return;
                                    objResponse.invoice = invoiceUpdate;
                                }
                                this.setProcessingData(objResponse);
                                return;
                            }
                            else {
                                (0, log_1.audit)({
                                    title: "succeed",
                                    details: "Ya existe una orden de venta relacionada con el ID Laika  ".concat(params.orderLaika, " , con el internalid  ").concat(recordId_1)
                                });
                                if (params.trnCode) {
                                    this.statusTransactionProccess(params);
                                }
                                this.setError(clr_integracion_backend_errors_1.Errors.SLO_DUPLICITY_SALES_ORDER, {
                                    orderLaika: params.orderLaika,
                                    salesOrder: recordId_1,
                                    customer: params.customer.internalid ? params.customer.internalid : "",
                                    invoice: params._action_invoice ? this.createInvoice(params) : ""
                                });
                                return;
                            }
                        }
                        else {
                            this.setError(clr_integracion_backend_errors_1.Errors.SLO_SUBSIDARY_DIFFERENT_MEXICO, {
                                customer: params.customer.internalid ? params.customer.internalid : ""
                            });
                        }
                    }
                    else {
                        params.recordId = params.internalId;
                        var statusSalesOrder = (0, search_1.lookupFields)({
                            type: search_1.Type.SALES_ORDER,
                            id: params.internalId,
                            columns: ["status"]
                        });
                        (0, log_1.audit)("statusSalesOrder", statusSalesOrder.status[0].value);
                        if (statusSalesOrder.status[0].value != "pendingBilling") {
                            var messageError = "No se puede realizar la facturacion, el estado de la Orden de Venta es: " + statusSalesOrder.status[0].text;
                            this.setError(clr_integracion_backend_errors_1.Errors.SLO_DIFERENT_PENDING_BILLING, {
                                errorDetail: messageError
                            });
                            (0, record_1.submitFields)({
                                type: "salesorder",
                                id: params.internalId,
                                values: { "custbody_cr_status_billing_sales_order": messageError }
                            });
                            if (this.hasError())
                                return;
                        }
                        if (Number(subsidarySalesOrder) == 9) {
                            params.recordId = params.internalId;
                            var invoiceCreate = this.createInvoice(params);
                            this.setProcessingData({ invoice: invoiceCreate ? invoiceCreate : "" });
                        }
                        else {
                            this.setError(clr_integracion_backend_errors_1.Errors.SLO_SUBSIDARY_DIFFERENT_MEXICO_INVOICE);
                        }
                    }
                }
            }
            catch (e) {
                this.setError(clr_integracion_backend_errors_1.Errors.SLO_METHOD_PUT, {
                    errorDetail: e.message,
                    salesOrder: params.recordId ? params.recordId : ""
                });
            }
        };
        customerSalesOrder.prototype.createOrUpdateSalesOrder = function (params) {
            try {
                var sublistId = "item";
                var currentSalesOrder_1;
                if (params.internalId) {
                    currentSalesOrder_1 = (0, record_1.load)({
                        type: "salesorder",
                        id: params.internalId,
                        isDynamic: true
                    });
                    var status_1 = currentSalesOrder_1.getValue({ fieldId: "orderstatus" });
                    var valid = ["A", "B"].some(function (statusC) { return statusC === status_1; });
                    if (!valid)
                        this.setError("".concat(clr_integracion_backend_errors_1.Errors.SLO_STATUS, " ").concat(currentSalesOrder_1.getText("status")), {
                            customer: params.customer.internalid
                        });
                    if (this.hasError())
                        return "false";
                    var lineCount = currentSalesOrder_1.getLineCount({ sublistId: sublistId });
                    if (params.items)
                        for (var index = 0; index < lineCount; index++) {
                            currentSalesOrder_1.removeLine({ sublistId: sublistId, line: 0 });
                        }
                }
                else {
                    currentSalesOrder_1 = (0, record_1.create)({
                        type: "salesorder",
                        isDynamic: true,
                        defaultValues: { entity: params.customer.internalid }
                    });
                    // funciones de setteo de valores
                    var setValueSalesOrder = function (fieldId, value) {
                        return currentSalesOrder_1.setValue({ fieldId: fieldId, value: value, ignoreFieldChange: true });
                    };
                    var setCurrentSublistValue = function (fieldId, value) {
                        return currentSalesOrder_1.setCurrentSublistValue({ sublistId: "item", fieldId: fieldId, value: value });
                    };
                    // setteo de campo de nivel de cuerpo de transaccion
                    {
                        setValueSalesOrder("subsidiary", params.subsidiary);
                        if (params.location)
                            setValueSalesOrder("location", params.location);
                        setValueSalesOrder("trandate", (0, format_1.parse)({
                            value: params.dateCreated, type: format_1.Type.DATE
                        }));
                        setValueSalesOrder("memo", params.nota);
                        setValueSalesOrder("shipdate", (0, format_1.parse)({
                            value: params.shipDate, type: format_1.Type.DATE
                        }));
                        setValueSalesOrder("custbody_id_laika", params.orderLaika);
                        if (params.custbody_crt_id_pasarela_pago)
                            setValueSalesOrder("custbody_crt_id_pasarela_pago", params.custbody_crt_id_pasarela_pago);
                        if (params.terms && !params.internalid)
                            setValueSalesOrder("terms", params.terms);
                        //if (params.shipAddress) { // comentado pendiente 18/08/2022
                        if (params.customer.addressLabelId) {
                            //const addressId = this.getAddressID(params.shipAddress, params.customer.internalid); // comentado pendiente 18/08/2022
                            var addressId = this.getAddressID(params.customer.addressLabelId, params.customer.internalid);
                            if (addressId > 0)
                                setValueSalesOrder("shipaddresslist", addressId);
                        }
                        //if (params.shipAddress) { // comentado pendiente 18/08/2022
                        if (params.customer.addressLabelId) {
                            //const addressId = this.getAddressID(params.billAddress, params.customer.internalid);// comentado pendiente 18/08/2022
                            var addressId = this.getAddressID(params.customer.addressLabelId, params.customer.internalid);
                            if (addressId > 0)
                                setValueSalesOrder("billaddresslist", addressId);
                        }
                        if (params.checkPago)
                            setValueSalesOrder("custbody_ft_lksl_checkpago", params.checkPago);
                        if (params.cuponesTxt)
                            setValueSalesOrder("custbody_ft_lksl_cupones", params.cuponesTxt);
                        if (params.statusApp)
                            setValueSalesOrder("custbody_ft_lksl_estadosovapp", params.statusApp);
                        if (params.coupon)
                            setValueSalesOrder("discountitem", params.coupon);
                        for (var i = 0; i < params.items.length; i++) {
                            var item = params.items[i];
                            (0, log_1.audit)("item obj", item);
                            currentSalesOrder_1.selectNewLine({ sublistId: sublistId });
                            // setteo de valores a nivel de linea de articulos
                            {
                                setCurrentSublistValue("item", item.item);
                                var itemType = currentSalesOrder_1.getCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: "itemtype"
                                });
                                if (itemType != "Discount") {
                                    setCurrentSublistValue("quantity", item.quantity);
                                    setCurrentSublistValue("location", item.location1);
                                }
                                if (item.hasOwnProperty("rate"))
                                    setCurrentSublistValue("rate", item.rate);
                                if (item.hasOwnProperty("taxcode")) {
                                    setCurrentSublistValue("taxcode", item.taxcode);
                                }
                                if (item.hasOwnProperty("amount"))
                                    setCurrentSublistValue("taxcode", item.taxcode);
                                if (item.hasOwnProperty("expectedshipdate"))
                                    setCurrentSublistValue("expectedshipdate", (0, format_1.parse)({
                                        value: item.expectedshipdate,
                                        type: format_1.Type.DATE
                                    }));
                            }
                            currentSalesOrder_1.commitLine({ sublistId: sublistId });
                        }
                        if (params.shipmethod)
                            currentSalesOrder_1.setValue({
                                fieldId: 'shipmethod',
                                value: params.shipmethod
                            });
                        if (params.shippingcost)
                            currentSalesOrder_1.setValue({
                                fieldId: 'shippingcost',
                                value: params.shippingcost
                            });
                        params.recordId = currentSalesOrder_1.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        if (params.recordId) {
                            var orderstatus = "";
                            switch (params.status.toUpperCase()) {
                                case "APPROVAL":
                                    orderstatus = "A"; // PENDING APPROVAL
                                    break;
                                case "FULFILLMENT":
                                    orderstatus = "B"; // PENDING FULFILLMENT
                                    break;
                                default:
                                    break;
                            }
                            if (orderstatus)
                                (0, record_1.submitFields)({
                                    type: "salesorder",
                                    id: params.recordId,
                                    values: { orderstatus: orderstatus }
                                });
                        }
                    }
                }
                return params.recordId;
            }
            catch (e) {
                (0, log_1.error)("Error createOrUpdateSalesOrder line", e.stack);
                (0, log_1.error)("Error createOrUpdateSalesOrder", e);
                this.setError(clr_integracion_backend_errors_1.Errors.SLO_CREATE_UPDATE, {
                    errorDetail: e.message,
                    customer: params.customer.internalid
                });
                return "Error";
            }
        };
        customerSalesOrder.prototype.createInvoice = function (params) {
            try {
                var invoiceObj_1 = (0, record_1.transform)({
                    fromType: "salesorder",
                    fromId: Number(params.recordId),
                    toType: "invoice"
                });
                // funcion de setteo de valores para campos a nivel de cuerpo de transaccion
                var setValueInvoice = function (fieldId, value) {
                    return invoiceObj_1.setValue(fieldId, value);
                };
                var subsidiaryInv = invoiceObj_1.getValue({ fieldId: "subsidiary" });
                if (subsidiaryInv == 9) {
                    setValueInvoice("customform", 164);
                    setValueInvoice("account", 1262);
                }
                else {
                    setValueInvoice("customform", 121);
                }
                if (params.invoiceDate) {
                    var dateParse = (0, format_1.parse)({
                        value: params.invoiceDate,
                        type: format_1.Type.DATE
                    });
                    if (dateParse) {
                        setValueInvoice("trandate", dateParse);
                    }
                }
                if (params.hasOwnProperty("toXML")) {
                    setValueInvoice("custbody_lka_to_xml", params.toXML);
                }
                else {
                    setValueInvoice("custbody_lka_to_xml", true);
                }
                return String(invoiceObj_1.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                }));
            }
            catch (e) {
                (0, log_1.error)("error al crear la factura en la linea ", log_1.error);
                this.setError(clr_integracion_backend_errors_1.Errors.SLO_CREATE_INVOICE, {
                    errorDetail: e.message,
                    customer: params.hasOwnProperty("customer") ? params.customer.internalid : "",
                    salesOrder: params.recordId
                });
                return "Error";
            }
        };
        customerSalesOrder.prototype.statusTransactionProccess = function (params) {
            switch (params.trnCode) {
                case "APV":
                    this.TransactionStatusAPV(params);
                    return;
                    break;
                case "ACT":
                    this.TransactionStatusACT(params);
                    return;
                    break;
                case "FFD":
                    this.TransactionStatusFFD(params);
                    return;
                    break;
                case "CLD":
                    this.TransactionStatusCLD(params);
                    return;
                    break;
                case "IAD":
                    this.TransactionStatusIAD(params);
                    return;
                    break;
                default:
                    break;
            }
        };
        customerSalesOrder.prototype.TransactionStatusAPV = function (params) {
            var recordId;
            var payStatusObj = (0, search_1.lookupFields)({
                type: "salesorder",
                id: params.recordId,
                columns: "custbody_ft_lksl_checkpago"
            });
            if (payStatusObj.custbody_ft_lksl_checkpago) {
                recordId = (0, record_1.submitFields)({
                    type: "salesorder",
                    id: params.recordId,
                    values: { "orderstatus": "B" } // PENDING FULFILLMENT
                });
            }
            else {
                this.setProcessingData({
                    code: "004",
                    message: "sin pago disponible"
                });
                return;
            }
            this.setProcessingData({
                code: "004",
                message: "approved id " + recordId
            });
        };
        customerSalesOrder.prototype.TransactionStatusACT = function (params) {
            var recordId = (0, record_1.submitFields)({
                type: "salesorder",
                id: params.recordId,
                values: params.datos,
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
            this.setProcessingData({
                code: "002",
                message: "updated id  ".concat(recordId)
            });
        };
        customerSalesOrder.prototype.TransactionStatusFFD = function (params) {
            var fulfillmentObj = (0, record_1.transform)({
                fromType: "salesorder",
                fromId: params.recordId.toString(),
                toType: "itemfulfillment"
            });
            if (params.invoiceDate)
                fulfillmentObj.setValue({
                    fieldId: "trandate",
                    value: (0, format_1.parse)({ value: params.invoiceDate, type: format_1.Type.DATE })
                });
            fulfillmentObj.setValue({ fieldId: "shipstatus", value: "C" });
            var count = fulfillmentObj.getLineCount({ sublistId: "item" });
            var quantity;
            var _loop_1 = function (i) {
                var getSublistValueFul = function (fieldId) {
                    return fulfillmentObj.getSublistValue({ sublistId: "item", fieldId: fieldId, line: i });
                };
                var item = getSublistValueFul("item");
                var itemType = getSublistValueFul("itemtype");
                var quantityFull = getSublistValueFul("quantityremaining");
                if (params.hasOwnProperty("quantities"))
                    quantity = params.quantities.splice(0, 1)[0] || 0;
                else
                    quantity = quantityFull;
                fulfillmentObj.setSublistValue({
                    sublistId: "item",
                    fieldId: "quantity",
                    line: i,
                    value: quantity
                });
                if (itemType != "Kit" && itemType != "NonInvtPart") {
                    var detailSubrecord = fulfillmentObj.getSublistSubrecord({
                        sublistId: "item",
                        fieldId: "inventorydetail",
                        line: i
                    });
                    detailSubrecord.setSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "quantity",
                        value: quantity,
                        line: 0
                    });
                }
            };
            for (var i = 0; i < count; i++) {
                _loop_1(i);
            }
            var recordId = fulfillmentObj.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            (0, log_1.debug)({ title: "FFD", details: { recordId: recordId, requestBody: params } });
            this.setProcessingData({
                code: "002",
                message: "itemFulfillment id  ".concat(recordId)
            });
        };
        customerSalesOrder.prototype.TransactionStatusCLD = function (params) {
            var objRecord = (0, record_1.load)({
                type: params.type,
                id: params.id
            });
            var count = objRecord.getLineCount({ sublistId: "item" });
            for (var i = 0; i < count; i++) {
                var item = objRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                    line: i
                });
                var itemType = (0, search_1.lookupFields)({ type: "item", id: item, columns: "type" });
                if (itemType != "Discount") {
                    objRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "isclosed",
                        line: i,
                        value: true
                    });
                }
            }
            var recordId = objRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            (0, log_1.debug)({ title: "CLD", details: { recordId: recordId, requestBody: params } });
            this.setProcessingData({
                code: "002",
                message: "canceled record  ".concat(recordId)
            });
        };
        customerSalesOrder.prototype.TransactionStatusIAD = function (params) {
            var invAdjustment = (0, record_1.create)({ type: "inventoryadjustment" });
            // setteo de valores a nivel de cuerpo de transaccion
            var setValueInventory = function (fieldId, value) {
                return invAdjustment.setValue({ fieldId: fieldId, value: value });
            };
            setValueInventory("account", params.account);
            setValueInventory("subsidiary", params.subsidiary);
            if (params.date)
                setValueInventory("trandate", params.date);
            setValueInventory("adjlocation", params.adjlocation);
            setValueInventory("custbody_ft_lk_gencxc", params.cxc);
            var _loop_2 = function (i) {
                var itemCurret = params.items[i];
                var setSublistValueInvetory = function (fieldId, value) {
                    return invAdjustment.setSublistValue({ sublistId: "inventory", fieldId: fieldId, value: value, line: i });
                };
                setSublistValueInvetory("item", itemCurret.item);
                if (itemCurret.location)
                    setSublistValueInvetory("location", itemCurret.location1);
                setSublistValueInvetory("newquantity", itemCurret.quantity);
                setSublistValueInvetory("adjustqtyby", itemCurret.quantity);
                var detailSubrecord = invAdjustment.getSublistSubrecord({
                    sublistId: "inventory",
                    fieldId: "inventorydetail",
                    line: i
                });
                detailSubrecord.setSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "quantity",
                    value: itemCurret.quantity,
                    line: 0
                });
            };
            for (var i = 0; i < params.items.length; i++) {
                _loop_2(i);
            }
            var recordId = invAdjustment.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            (0, log_1.debug)({ title: "IAD", details: { recordId: recordId, requestBody: params } });
            (0, log_1.audit)("doPoat.succeed", { status: "succeed", message: "internalid " + recordId });
            this.setProcessingData({
                code: "succeed",
                message: "internalid  ".concat(recordId)
            });
        };
        customerSalesOrder.prototype.getAddressID = function (labelID, customerID) {
            var search = (0, search_1.create)({
                type: search_1.Type.CUSTOMER,
                columns: [
                    { name: "addressinternalid", join: "address" },
                    { name: "internalid", join: "address" }
                ],
                filters: [
                    ["isinactive", "is", "F"], "and",
                    ["address.custrecord_label_address", "is", labelID], "and",
                    ["internalid", "is", customerID]
                ]
            });
            var resultSet = search.run();
            var result = resultSet.getRange({ start: 0, end: 1 });
            var numberReturn = 0;
            if (result.length > 0) {
                (0, log_1.audit)("result 0 getAddressID", result[0]); // Maiky
                numberReturn = Number(result[0].getValue({ name: "addressinternalid", join: "address" }));
            }
            return numberReturn;
        };
        return customerSalesOrder;
    }(clr_integracion_backend_async_1.AsyncJob));
    exports.customerSalesOrder = customerSalesOrder;
});
