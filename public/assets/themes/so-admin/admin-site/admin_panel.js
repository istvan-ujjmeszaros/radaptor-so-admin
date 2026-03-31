//jQuery.noConflict();
$(document).ready(
    function()
    {
        var in_animation = false;
        var switcher_pos = 0;
        var switcher_pos_hover = 0;
		var duration = 150;
        var background_image = $('#admin_panel_switcher').css('background-image');
        var img = $('#admin_panel_switcher span img');
        var admin_panel_switcher_width = 152;

        $('#admin_panel').css('display', 'block');
        $('#admin_panel').css('top', '-'+$('#admin_panel').css('height'));

        $('#admin_panel_switcher').css('display', 'block');
        $('#admin_panel_switcher').hide();
        $('#admin_panel_switcher').css('top', switcher_pos);

        $('#admin_panel_switcher').css('left', $('#admin_panel').width()/2-admin_panel_switcher_width/2);

        $("#admin_panel_switcher").hoverIntent({
            sensitivity: 20, // number = sensitivity threshold (must be 1 or higher)
            interval: 100, // number = milliseconds for onMouseOver polling interval
            timeout: 300, // number = milliseconds delay before onMouseOut
            over:
            function(){
                if (in_animation)
                    return;

                if ($('#admin_panel').css('top')=='0px')
                {
                    $('#admin_panel_switcher').animate({
                        top:$('#admin_panel').height()+switcher_pos_hover
                    }, duration).css('background-image', 'none');
                }
                else
                {
                    $('#admin_panel_switcher').animate({
                        top:switcher_pos_hover
                    }, duration).css('background-image', 'none');
                }
            },
            out:
            function(){
                if (in_animation)
                    return;
                if ($('#admin_panel').css('top')=='0px')
                {
                    $('#admin_panel_switcher').animate({
                        top:$('#admin_panel').height()+switcher_pos
                    }, duration).css('background-image', background_image);
                }
                else
                {
                    $('#admin_panel_switcher').animate({
                        top:switcher_pos
                    }, duration).css('background-image', background_image);
                }
            }
        });

        //        setTimeout("$('#admin_panel_switcher').slideDown()",500);
        setTimeout("$('#admin_panel_switcher').show('drop', {direction: 'up'})",500);

        $(window).resize(function(){
            if (in_animation)
                return;

            $('#admin_panel_switcher').css('left', $('#admin_panel').width()/2-admin_panel_switcher_width/2);

            if ($('#admin_panel').css('top')=='0px')
            {
                $('#admin_panel_switcher').css('top', $('#admin_panel').height()+switcher_pos);
                $('body').css('margin-top', $('#admin_panel').css('height'));
            }
            else
            {
                $('#admin_panel').css('top', '-'+$('#admin_panel').css('height'));
                $('#admin_panel_switcher').css('top', switcher_pos);
            }
        });

        $('#admin_panel_switcher').click(
            function(){
                in_animation = true;
                $('#admin_panel_switcher').hide().css('background-image', background_image);
                // nyitott állapotút zárunk
                if ($('#admin_panel').css('top')=='0px')
                {
                    $('#admin_panel').animate({
                        top:('-'+$('#admin_panel').css('height'))
                    },
                    {
                        easing:'easeOutCubic',
                        complete: function(){
                            in_animation = false;
                            setTimeout("$('#admin_panel_switcher').show('drop', {direction: 'up'})",500);
                        }
                    });

                    img.attr('src', img.attr('src').replace('-up', '-down'))

                    $('body').animate({
                        marginTop:0
                    },{
                        easing:'easeOutCubic',
                        step: function(){
                            $(window).resize()
                        }
                    });
                }
                else // zárt állapotút nyitunk
                {
                    $('#admin_panel').animate({
                        top:'0px'
                    },
                    {
                        easing:'easeOutCubic',
                        complete: function(){
                            in_animation = false;
                            setTimeout("$('#admin_panel_switcher').show('drop', {direction: 'up'})",500);
                        }
                    });

                    img.attr('src', img.attr('src').replace('-down', '-up'))

                    $('body').animate({
                        marginTop:$('#admin_panel').css('height')
                    },{
                        easing:'easeOutCubic',
                        step: function(){
                            $(window).resize();
                        }
                    });
                }
            });
    }
    );

