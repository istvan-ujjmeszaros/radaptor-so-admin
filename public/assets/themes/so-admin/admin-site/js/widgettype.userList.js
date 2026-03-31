/**
 * User list DataTable functionality for SoAdmin theme.
 * Uses DataTables 2.x API with API envelope unwrapping.
 */
if (typeof(widgettype) != "object")
    var widgettype = {};

widgettype.userList = new function()
{
    var _config = {};
    var _userListTable;

    this.bindEvents = function()
    {
        $(window).on("resize", function() {
            if (_userListTable) {
                _userListTable.columns.adjust();
            }
        });
    }

    this.initUserListTable = function()
    {
        _userListTable = new DataTable("#" + _config.userListTableId, {
            columns: [
                {
                    orderable: true,
                    searchable: true,
                    render: function(data, type, row) {
                        if (type === 'display') {
                            var target_url = _config.url_datasheet + (data * 1) + '/';
                            return '<a href="' + target_url + '">' + data + '</a>';
                        }
                        return data;
                    }
                },
                {
                    searchable: true,
                    type: "html"
                },
                {
                    orderable: false,
                    width: '140px',
                    className: 'dt-operations',
                    render: function(data, type, row) {
                        if (type !== 'display') return data;

                        var id = data;
                        var operation_edit = '<a class="operation-edit" data-operation="edit" data-id="' + id + '" title="szerkeszt">' + _config.icon_edit + '</a>';
                        var operation_datasheet = '<a class="operation-datasheet" data-operation="datasheet" data-id="' + id + '" title="adatlap">' + _config.icon_datasheet + '</a>';
                        var operation_roles = '<a class="operation-roles" data-operation="roles" data-id="' + id + '" title="szerepek">' + _config.icon_roles + '</a>';
                        var operation_usergroups = '<a class="operation-usergroups" data-operation="usergroups" data-id="' + id + '" title="csoportok">' + _config.icon_usergroups + '</a>';

                        var ret = "";
                        if (_config.operation_edit) ret += operation_edit;
                        if (_config.operation_datasheet) ret += operation_datasheet;
                        if (_config.operation_roles) ret += operation_roles;
                        if (_config.operation_usergroups) ret += operation_usergroups;

                        return ret;
                    }
                }
            ],
            layout: {
                topStart: 'pageLength',
                topEnd: 'search',
                bottomStart: 'info',
                bottomEnd: 'paging'
            },
            info: true,
            paging: true,
            processing: true,
            stateSave: false,
            ajax: {
                url: _config.ajaxBaseUrl + "Load",
                dataSrc: function(payload) {
                    if (!payload || payload.ok !== true) {
                        return [];
                    }
                    return (payload.data && payload.data.data) ? payload.data.data : [];
                }
            },
            language: {
                infoFiltered: "<br><i>sz\u0171rt eredm\u00e9ny _MAX_ adatsorb\u00f3l</i>",
                infoEmpty: "Nincs tal\u00e1lat",
                info: "_TOTAL_ megjelen\u00edthet\u0151 elem (megjelen\u00edtve: _START_ - _END_)",
                emptyTable: "- - -",
                paginate: {
                    first: "Els\u0151",
                    last: "Utols\u00f3",
                    next: "K\u00f6vetkez\u0151",
                    previous: "El\u0151z\u0151"
                },
                search: "Keres\u00e9s:",
                zeroRecords: "Nincs megjelen\u00edthet\u0151 elem"
            },
            rowCallback: function(row, data, displayNum, displayIndex, dataIndex) {
                widgettype.userList.bindOperationEvents(row);
            },
            scrollY: "100%",
            scrollX: true
        });
    }

    this.bindOperationEvents = function(in_element)
    {
        $(in_element).find(".operation-edit").on("click", function(e){
            window.location = _config.url_edit + '&item_id=' + $(this).data("id");
            e.preventDefault();
            return false;
        });

        $(in_element).find(".operation-datasheet").on("click", function(e){
            window.location = _config.url_datasheet + $(this).data("id") + '/';
            e.preventDefault();
            return false;
        });

        $(in_element).find(".operation-roles").on("click", function(e){
            window.location = _config.url_roles + $(this).data("id") + '/';
            e.preventDefault();
            return false;
        });

        $(in_element).find(".operation-usergroups").on("click", function(e){
            window.location = _config.url_usergroups + $(this).data("id") + '/';
            e.preventDefault();
            return false;
        });
    }

    this.init = function(config)
    {
        _config = config;
        this.bindEvents();
        this.initUserListTable();
    }
}
