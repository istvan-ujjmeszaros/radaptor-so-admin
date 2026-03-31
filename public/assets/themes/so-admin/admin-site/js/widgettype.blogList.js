/**
 * Blog list DataTable functionality for SoAdmin theme.
 * Uses DataTables 2.x API with API envelope unwrapping.
 */
if (typeof(widgettype) != "object")
    var widgettype = {};

widgettype.blogList = new function()
{
    var _config = {};
    var _blogListTable;

    this.bindEvents = function()
    {
        $(window).on("resize", function() {
            if (_blogListTable) {
                _blogListTable.columns.adjust();
            }
        });
    }

    this.initBlogListTable = function()
    {
        _blogListTable = new DataTable("#" + _config.blogListTableId, {
            columns: [
                {
                    orderable: true,
                    searchable: false
                },
                {
                    orderable: true,
                    searchable: true
                },
                {
                    searchable: true,
                    type: "html"
                },
                {
                    orderable: false,
                    render: function(data, type, row) {
                        if (type !== 'display') return data;

                        var id = row[0];
                        var operation_edit = '<a class="operation-edit" data-operation="edit" data-id="' + id + '" title="szerkeszt">' + _config.icon_edit + '</a>';

                        var ret = "";
                        if (_config.operation_edit) ret += operation_edit;

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
                widgettype.blogList.bindOperationEvents(row);
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
    }

    this.init = function(config)
    {
        _config = config;
        this.bindEvents();
        this.initBlogListTable();
    }
}
