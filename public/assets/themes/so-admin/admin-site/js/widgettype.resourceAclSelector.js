/**
 * Resource ACL selector functionality for SoAdmin theme.
 * Uses DataTables 2.x API with API envelope unwrapping.
 */
if (typeof(widgettype) != "object")
    var widgettype = {};

widgettype.resourceAclSelector = new function()
{
    var _config = {};
    var _inheritedTable;
    var _specificTable;
    var _checkboxvalues = {};

    this.bindEvents = function()
    {
        $('#' + _config.checkbox_id).on('change', function() {
            widgettype.resourceAclSelector.updateInheritance();
        });

        $(window).on("resize", function() {
            if (_inheritedTable) _inheritedTable.columns.adjust();
            if (_specificTable) _specificTable.columns.adjust();
        });
    }

    this.updateInheritance = function()
    {
        var checked = $('#' + _config.checkbox_id).is(':checked') ? 1 : 0;

        $.ajax({
            method: "get",
            url: _config.ajaxBaseUrl + "SetInheritance",
            data: {
                "inheritance": checked
            },
            dataType: "json",
            cache: false,
            success: function(r) {},
            complete: function()
            {
                renderSystemMessages();

                _inheritedTable.ajax.reload(function() {
                    if (checked)
                        widgettype.resourceAclSelector.showInherited();
                    else
                        widgettype.resourceAclSelector.hideInherited();
                });
            }
        });
    }

    this.hideInherited = function()
    {
        $('#acl-userselector-inherited').slideUp();
    }

    this.showInherited = function()
    {
        $('#acl-userselector-inherited').slideDown();
        if (_inheritedTable) _inheritedTable.columns.adjust();
    }

    this.initInheritedTable = function()
    {
        _inheritedTable = new DataTable("#" + _config.inheritedTableId, {
            columns: [
                { searchable: true, type: "html" },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false }
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
            defaultContent: "",
            ajax: {
                url: _config.ajaxBaseUrl + "SubjectList&type=inherited",
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
            scrollY: "100%",
            scrollX: true
        });
    }

    this.initSpecificTable = function()
    {
        _specificTable = new DataTable("#" + _config.specificTableId, {
            columns: [
                { searchable: true, type: "html" },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                { orderable: false, searchable: false },
                {
                    orderable: false,
                    render: function(data, type, row) {
                        if (type !== 'display') return data;
                        return '<a class="operation" data-operation="deleteAcl" data-id="' + data + '" title="t\u00f6r\u00f6l">' + _config.icon_trash + '</a>';
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
            defaultContent: "",
            ajax: {
                url: _config.ajaxBaseUrl + "SubjectList&type=specific",
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
                $(row).find("input").on('change', function() {
                    widgettype.resourceAclSelector.saveOperationState(this);
                });
                widgettype.resourceAclSelector.bindOperationEvents(row);
            },
            scrollY: "100%",
            scrollX: true
        });

        $("#" + _config.specificTableId + "_wrapper").prepend('<div class="new-object-selector">Új hozzárendelés: <input class="new-object-selector-input" type="text"><a href="#" class="controller-menu">Hozzárendel</a></div>');
    }

    this.saveOperationState = function(element)
    {
        var checked = $(element).is(':checked') ? 1 : 0;
        var data = $(element).data();

        if (_checkboxvalues[data.acl_id + data.operation] === checked)
            return;

        _checkboxvalues[data.acl_id + data.operation] = checked;

        $.ajax({
            method: "get",
            url: _config.ajaxBaseUrl + "SetOperation",
            data: {
                "checked": checked,
                "operation": data.operation,
                "acl_id": data.acl_id
            },
            dataType: "json",
            cache: false,
            success: function(r) {},
            complete: function()
            {
                _specificTable.ajax.reload();
                renderSystemMessages();
            }
        });
    }

    this.initObjectSelector = function()
    {
        function split( val ) {
            return val.split( /,\s*/ );
        }
        function extractLast( term ) {
            return split( term ).pop();
        }

        $(".new-object-selector-input")
        .on( "keydown", function( event ) {
            if ((event.keyCode === $.ui.keyCode.TAB) && ($(this).data( "ui-autocomplete" ).menu.active))
            event.preventDefault();
            })
        .on( "keyup", function( event ) {
            if ( event.keyCode !== $.ui.keyCode.ENTER )
            $(this).data("object_type", "unknown");
            $(this).data("object_name", $(this).val().trim());
            })
        .autocomplete({
            source: function( request, response ) {
            $.getJSON(_config.ajaxBaseUrl+"ObjectListAutocomplete", {
                term: extractLast( request.term )
                }, response );
            },
            search: function() {
            var term = extractLast( this.value );
            },
            focus: function() {
            return false;
            },
            select: function( event, ui ) {
            var input = $(".new-object-selector-input");
            $(input).val( stripTags(ui.item.object_name));
            $(input).data("object_type", ui.item.object_type);
            $(input).data("object_name", ui.item.object_name);
            return false;
            }
            })
        .data( "ui-autocomplete" )._renderItem = function( ul, item )
        {
            item.label = item.object_name.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + $.ui.autocomplete.escapeRegex($.trim(this.term)) + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>");

            var visible_label;
            if (item.object_type == "user")
                visible_label = "<a>" + _config.icon_user + item.label + "</a>";
            else if (item.object_type == "usergroup")
                visible_label = "<a>" + _config.icon_usergroup + item.label + "</a>";
            else
                visible_label = "<a>" + item.label + "</a>";

            return $("<li></li>")
            .data("item.autocomplete", item)
            .append(visible_label)
            .appendTo(ul);
        };

        $("a.controller-menu").on("click", function(e) {
            e.preventDefault();

            var input = $(".new-object-selector-input");

            if ($(input).val().trim() === "")
                return false;

            var object_type = $(input).data("object_type");
            var object_name = $(input).data("object_name");

            $.ajax({
                method: "get",
                url: _config.ajaxBaseUrl + "AddObject",
                data: {
                    "object_type": object_type,
                    "object_name": object_name
                },
                dataType: "json",
                cache: false,
                success: function(r)
                {
                    if (r && r.ok === true)
                    {
                        $(input).val("");
                        $(input).removeData();
                    }
                },
                complete: function()
                {
                    _specificTable.ajax.reload();
                    renderSystemMessages();
                }
            });

            return false;
        });
    }

    this.bindOperationEvents = function(in_element)
    {
        $(in_element).find(".operation").on("click", function(e){
            var acl_id = $(this).data("id");
            var operation = $(this).data("operation");
            operation = operation.charAt(0).toUpperCase() + operation.slice(1);

            $.ajax({
                method: "get",
                url: _config.ajaxBaseUrl + operation,
                data: {
                    "acl_id": acl_id
                },
                dataType: "json",
                cache: false,
                success: function(r) {},
                complete: function()
                {
                    _specificTable.ajax.reload();
                    renderSystemMessages();
                }
            });

            e.preventDefault();
            return false;
        });
    }

    this.init = function(config)
    {
        _config = config;

        this.bindEvents();

        this.initInheritedTable();

        if (!$('#' + _config.checkbox_id).is(':checked'))
            $('#acl-userselector-inherited').hide();

        this.initSpecificTable();

        this.initObjectSelector();
    }
}
