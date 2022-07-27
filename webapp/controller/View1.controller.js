sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "it/orogel/depositbooklet/model/Constants",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Constants, Filter, FilterOperator, JSONModel) {
        "use strict";

        return Controller.extend("it.orogel.depositbooklet.controller.View1", {
            onInit: function () {
                this.oComponent = this.getOwnerComponent();
                this.oGlobalBusyDialog = new sap.m.BusyDialog();
                this.oInterestRateDialog = null;
                var interestModel = this.getOwnerComponent().getModel("interestModel");
                interestModel.setData([
                    { Amount: 500, DateFrom: '01-01-2022', DateTo: '31-08-2022', InterestRate: 2 },
                    { Amount: 500, DateFrom: '01-09-2022', DateTo: '31-12-2022', InterestRate: 3 }
                ]);
                // var interestModel = this.getOwnerComponent().setModel(new JSONModel([
                //     { Amount: 500, DateFrom: '2022-01-01', DateTo: '2022-08-31', InterestRate: 2 }]), "interestModel");
            },
            /**
             *  On GO button event handler
             * ---------------------------
             */
            onGo: function () {

                // Assign values from inputs
                this.CompanyCode = this.byId("companyCode").getValue();
                this.SupplierCode = this.byId("supplierCode").getValue();
                this.DateRange = this.byId("dateRangeSelection").getValue();
                this.DateFrom = this.byId("dateRangeSelection").getDateValue();
                this.DateTo = this.byId("dateRangeSelection").getSecondDateValue();

                if (this.CompanyCode && this.SupplierCode && this.DateRange) {
                    this.byId("companyCode").setValueState();
                    this.byId("supplierCode").setValueState();
                    this.byId("dateRangeSelection").setValueState();
                    this._startExtraction();
                } else {
                    if (!this.CompanyCode)
                        this.byId("companyCode").setValueState("Error");
                    if (!this.SupplierCode)
                        this.byId("supplierCode").setValueState("Error");
                    if (!this.DateRange)
                        this.byId("dateRangeSelection").setValueState("Error");
                }
            },
            /**
            * On Reset button event handler
            * -----------------------------
            */
            onReset: function () {
                //Resets all filters
                this.byId("companyCode").setValue("");
                this.byId("companyCode").setValueState();
                this.byId("supplierCode").setValue("");
                this.byId("supplierCode").setValueState();
                this.byId("dateRangeSelection").setValue("");
                this.byId("dateRangeSelection").setValueState();
            },
            /**
            * On Interest button event handler
            * -----------------------------
            */
            onOpenInterestRateDialog: function () {
                if (this.oInterestRateDialog === null) {

                    this.oInterestRateDialog = sap.ui.xmlfragment("it.orogel.depositbooklet.view.fragment.InterestTable", this)
                    this.getView().addDependent(this.oInterestRateDialog);
                }
                this.oInterestRateDialog.open();
            },
            /**
            * On Save button Interest Rate Dialog event handler
            * -----------------------------
            */
            onSaveInterestRateDialog: function () {
                this.refresh("interestModel")
                this. onCloseInterestRateDialog();
            },
            /**
            * On Close button Interest Rate Dialog event handler
            * -----------------------------
            */
            onCloseInterestRateDialog: function () {
                this.oInterestRateDialog.close();
                this.oInterestRateDialog.destroy();
                this.oInterestRateDialog = null;
            },
            /**
            * On Add row button
            */
            onAddInterestRow: function () {
                this.getOwnerComponent().getModel("interestModel").getData().push({ Amount: "", DateFrom: "", DateTo: "", InterestRate: "" });
                this.refresh("interestModel");
            },
            /**
            * On Delete row button
            */
            onDeleteInterestRow: function () {
                //debugger;
                let aIndices = sap.ui.getCore().byId("interestTable").getSelectedIndices();
                
                 aIndices.forEach(index=> {
                    this.getOwnerComponent().getModel("interestModel").getData().splice(index, 1);
                 });
               
               sap.ui.getCore().byId("interestTable").clearSelection();
                this.refresh("interestModel");
            },
            /**
            * Start extraction
            * ----------------
            */
            _startExtraction: async function () {
                this.oGlobalBusyDialog.open();

                let aFilters = [];

                // Make dates compatible
                let dDateFrom = new Date(this.DateFrom.getTime()),
                    dDateTo = new Date(this.DateTo.getTime()),
                    nTimezone = dDateFrom.getTimezoneOffset() / 60;
                dDateFrom.setHours(dDateFrom.getHours() - nTimezone);
                dDateTo.setHours(dDateTo.getHours() - nTimezone);

                //testing
                this.CompanyCode = "IT04";
                aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, this.CompanyCode));
                //aFilters.push(new Filter("Supplier", FilterOperator.EQ, this.SupplierCode));
                //aFilters.push(new Filter("SpecialGLCode", FilterOperator.EQ, "5"));
                //aFilters.push(new Filter("ClearingAccountingDocument", FilterOperator.EQ, ""));
                aFilters.push(new Filter("DocumentDate", FilterOperator.BT, dDateFrom, dDateTo));

                // Call API_OPLACCTGDOCITEMCUBE_SRV entity /A_OperationalAcctgDocItemCube
                let aAccountingDocumentExtraction = await this.APIGet(this.getView().getModel(), Constants.API.ACDOCA.SERVICE,
                    aFilters, "CompanyCode,CompanyCodeName,Supplier,SupplierName,SpecialGLCode,ClearingAccountingDocument,DocumentDate,AmountInTransactionCurrency");

                debugger;
                this.oGlobalBusyDialog.close();
            },
            /**
             * APIGET
             * @param {*} oModel 
             * @param {*} sEntitySet 
             * @param {*} aFilters 
             * @param {*} select 
             */
            APIGet: function (oModel, sEntitySet, aFilters, select) {
                var aReturn = {
                    returnStatus: false,
                    data: []
                };
                return new Promise(function (resolve, reject) {
                    oModel.read(sEntitySet, {
                        urlParameters: {
                            "$format": "json",
                            "$select": select
                        },
                        filters: aFilters,
                        success: function (oData) {
                            aReturn.returnStatus = true;
                            if (oData.results) {
                                aReturn.data = oData.results;
                            } else {
                                aReturn.data = oData;
                            }
                            resolve(aReturn.data);
                        },
                        error: function (e) {
                            aReturn.returnStatus = false;
                            reject(e);
                        }
                    });
                });
            },
            refresh: function (model) {
                this.getOwnerComponent().getModel(model).refresh();
            }
        });
    });
