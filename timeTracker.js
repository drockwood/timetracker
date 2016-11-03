
/*********************************  
        TIME TRACKER COMPONENT
**********************************/

function TimeTracker($el) {
    var
        timerIntvl,     //handle for the timer interval
        $timeState,     //state of the timetrack form, active or inactive
        $timeFrm,
        $taskName,
        $taskID,
        $matterName,
        $matterID,
        $timeStart,     //time that recording started
        $timeDurr,      //reference to hidden field hold duration
        timeSec,        //value of that hidden field
        timeDiff,       //value of time since recording
        $trackBtn,
        $tracker
    ;

    $tracker = $('<div id="timeTracker"><form data-state="inactive" class="timeRecordForm"><ul></ul></form></div>');
    $("ul", $tracker)
        .append('<li><button type="submit" class="recordControl start" title="Time Tracking"><span class="glyphicons glyphicons-play"></span> &nbsp; Time Tracking</button></li>')
        .append('<li><label for="trackingTaskName">Task:</label><input type="text" id="trackingTaskName" name="taskName" placeholder="Enter Task" data-container="TaskName" maxlength="25" /><input type="hidden" id="trackingTaskID" name="taskID"  data-container="TaskID" /></li>')
        .append('<li><label for="trackingMatterName">Associated Matter:</label><input type="text" id="trackingMatterName" name="matterName" placeholder="Select Matter" data-container="MatterName"/><input type="hidden" id="trackingMatterID" name="matterID" data-container="MatterID" /></li>')
        .append('<li><div class="timetrackCounter"><span class="incr hours">00</span>h <span class="incr minutes">00</span>m <span class="incr seconds">00</span>s </div><input type="hidden" name="durationSec" id="durationSec" value="0" data-container="TaskSec" /><input type="hidden" id="trackingStart" name="startTime" data-container="startTime"/></li>')
    ; 

    if($el.length  > 0) {
        $el.append($($tracker));
        $timeState  = $('#timeTracker .timeRecordForm').data().state;
        $timeFrm    = $('#timeTracker .timeRecordForm');
        $taskName   = $('#trackingTaskName', $timeFrm); 
        $taskID     = $('#trackingTaskID', $timeFrm);
        $matterName = $('#trackingMatterName', $timeFrm);
        $matterID   = $('#trackingMatterID', $timeFrm);
        $timeStart  = $('#trackingStart', $timeFrm);
        $timeDurr   = $("#durationSec", $timeFrm);
        $trackBtn   = $('.recordControl', $timeFrm);

        $taskName.suggest('Task');
        $matterName.suggest('Matter', true); // don't allow free user input
        $timeFrm.setFieldState($matterName, 'close');
    }

    //
    // timetracker custom functions
    //

    // initialize the state by checking for cookies
    $tracker.initialize = function() {
        if(timesheet = this.handleCookie('Read')) {
            this.reload(timesheet);
            if(timesheet.recordState == 'active') {
                this.startTimeTracking();
            }
        }
    }

    // preserve cookie state after a page jump
    $tracker.handleCookie = function(opp) {
        if(opp == "Read") {
            if(cookie = readCookie('timerCookie')) {
                result = {};
                $.each(cookie.split("&"), function(index){
                    keyVal = this.split("=");
                    result[keyVal[0]] = decodeURI(keyVal[1]);
                });
                return result;
            } 
            return false;
        }
        else if(opp == "Update") {
            //update cookie
            var total_time;
            total_time = timeSec;

            if($timeFrm.data().state == "inactive") {
                $timeStart.val('');
            } 

            var timesheet;
            timesheet = $taskID.data().container + "=" + $taskID.val() + "&";
            timesheet += $taskName.data().container + "=" + $taskName.val() + "&";
            timesheet += $matterName.data().container + "=" + $matterName.val() + "&";
            timesheet += $matterID.data().container + "=" + $matterID.val() + "&";
            timesheet += $timeDurr.data().container + "=" + total_time + "&";
            timesheet += $timeStart.attr('name') + "=" + $timeStart.val() + "&";
            timesheet += 'recordState=' + $('.timeRecordForm').data().state;
            createCookie('timerCookie',encodeURI(timesheet),100);

            return timesheet;
        }
        else if(opp == "Erase") {
            eraseCookie('timerCookie');
            return true;
        }
        else if(opp == "Check") {

            check = $tracker.handleCookie('Read');
            if(!check) {
                return true;
            }

            // also make sure id's match
            if(check.TaskID != $taskID.val() && check.recordState == 'active') {
                alert('You are already tracking a different task in another tab.');
                this.reload(check);
            }

            // also check for different times
            else if(parseInt(check.TaskSec) != parseInt($timeDurr.val()) && (check.TaskID == $taskID.val())) {
                this.reload(check);
            }
            else if(check.startTime != $timeStart.val() && (check.TaskID == $taskID.val())) {
                this.reload(check);
            }
           
            return true;         //maybe this should return a different value if it falls into one of the conditions
        }
        else if(opp == "Sync") {
            if(check = $tracker.handleCookie('Read')) {
                // if timer is inactive then fullstop
                if(check.recordState == 'inactive') {
                    return false;
                } else {
                    return true;
                }
            } else { 
                return false;
            }
        }
    }

    $tracker.calcDiff = function() {
        // set these very important variables
        timeDiff = timeDiff || 0;
        timeSec = parseInt($timeDurr.val()) || 0;

        var date_from_input = $timeStart.val().replace(/-/g, '/');
        var start = Math.floor(new Date(date_from_input).getTime() / 1000);
        var now = Math.floor(new Date().getTime() / 1000);
        timeDiff = now - start;
    }

    // increment the counter
    $tracker.addTime = function() {
        if(!$tracker.handleCookie('Sync')) {
            $tracker.stopTimeTracking(true);  // no updating db
            return false;
        }
        $tracker.handleCookie('Check');
        $tracker.calcDiff();

        // add to cumulative time
        $tracker.formatTime(timeSec + timeDiff);     //displays total time

        //update cookie
        $tracker.handleCookie('Update');
    }

    // format counter for humans
    $tracker.formatTime = function(timeinsec) {
        // make sure it's an int
        if(!timeinsec) {
            timeinsec = parseInt($timeDurr.val()) || 0;
        }

        h = Math.floor(timeinsec/3600);
        m = Math.floor(timeinsec/60%60);
        s = timeinsec%60;

        h = (h.toString().length >= 2) ? h.toString() : "0" + h.toString();
        m = (m.toString().length >= 2) ? m.toString() : "0" + m.toString();
        s = (s.toString().length >= 2) ? s.toString() : "0" + s.toString();

        $('.incr.hours').html(h);
        $('.incr.minutes').html(m);
        $('.incr.seconds').html(s);
    }

    $tracker.startTimeTracking = function() { 
        if(!$tracker.handleCookie('Check')) {
            return false;
        }

        // log start time
        if($timeStart.val() == "") {
            var start = new XDate();
            $timeStart.val(start.toString('yyyy-MM-dd H:mm:s'));
        }

        // toggle timetracker button
        this.setButtonState();

        // keep state in sync
        this.handleCookie('Update');

        //start counter
        timerIntvl = setInterval(this.addTime, 1000);
    }
    
    $tracker.stopTimeTracking = function(no_db_update) { 
        //optional argument 
        if(no_db_update === undefined) {
            no_db_update = false;
        }
        //stop counter
        clearInterval(timerIntvl);
        delete timerIntvl;

        //toggle button
        this.setButtonState();

        // consolidate the time values
        $tracker.calcDiff();
        timeSec = timeSec + timeDiff;
        timeDiff = 0;
        $timeDurr.val(timeSec);
        $tracker.formatTime();

        var end = new XDate();
        timesheet = $timeFrm.serialize();
        timesheet += "&endTime=" + end.toString('yyyy-MM-dd H:mm:s');
        timesheet += "&action=addNewTimesheet";
        if(no_db_update) {
            return;
        }
        
        // update db
        createTimesheet(timesheet);

        // cookie update is moved to creatTimesheet
        // this.handleCookie('Update');
    }

    $tracker.reload = function(results, autosubmit) {
        //optional argument to automsubmit on update
        if(autosubmit === undefined) {
            autosubmit = false;
        }

        $timeFrm.trigger('reset');              // in case anything is loaded in there

        $.each(results, function(index) {
            input_str = (this.toString() == '[object Window]') ? "" : this.toString();
            data_field = $('[data-container=' + index + ']', $timeFrm);

            if(typeof data_field != "undefined") {
                data_field.val(input_str);
                $timeFrm.setFieldState(data_field, 'readonly');
            }  
        });
        
        if(autosubmit) {
            data_field.trigger('change');
        }
        $tracker.calcDiff();
        $tracker.formatTime(timeSec + timeDiff);
    }

    // this state on the button lets the form know to automatically start counting or stay idle
    // it will have to be added to cookie as well :(
    $trackBtn.on('click', function(event) {
        state_arr = ['up', 'down'];
        curr_state = state_arr.indexOf($trackBtn.data().state);
        new_state = (curr_state > 0) ? 0 : 1;
        $trackBtn.data('state', state_arr[new_state]);
    });

    $taskName.on('click', function(event) {
        if($timeFrm.data().state == 'inactive') {
            $timeFrm.setFieldState($taskName, 'open');
            $timeFrm.trigger('reset');
            $tracker.handleCookie('Erase');
        } 
    });

    // load data results into timetracker fields
    // $timeFrm.refresh = function(results, live_reload) {
    //     
    // }

    $timeFrm
        .on('change', function(event) {
            switch(event.target.id) {
                case "trackingTaskName":
                    if($taskName.val() != "" && $taskID.val() != "") {
                        retrieveTaskTrackingData($taskID.val(), true);
                        $timeFrm.setFieldState($matterName, 'readonly');
                    }

                    else if($taskName.val() != "" && $taskID.val() == "") {
                        $timeFrm.setFieldState($matterName, 'open');
                    }
                break;

                case "trackingMatterName":
                case "trackingMatterID":
                    $timeFrm.submit();
                break;

                case "durationSec":
                    //formatTime();
                break;
            }
        })
        .on('reset', function(event) {  
            // reset these very important variables
            timeSec = 0;
            timeDiff = 0;    

            //manually reset hidden fields, other fields will be reset automatically
            $('input[type=hidden]', $timeFrm).val('');

            //
            $timeFrm.setFieldState($matterName, 'close');

            //update time
            $tracker.formatTime();
        })
        .on('submit', function(event) {
            event.preventDefault();

            if($(this).valid()) {                                   // && trackBtn.data().state == 'down'
                if($timeFrm.data().state == 'inactive') {  
                    $tracker.startTimeTracking();
                }
                else if($timeFrm.data().state == 'active') {        
                    $tracker.stopTimeTracking();
                }

                $trackBtn.data('state', 'up')
            }
        });

    // validate form
    $timeFrm.validate({
        submitHandler: function(form) {
            //

        },
        errorPlacement: function(error, element) {
            //
            // console.log(element);
        },
        rules: {    
          taskName: {
              required: true,
          },
          matterName: {
              required: true,
              check_matter: true
          }
        }
        
    });

    jQuery.validator.addMethod("check_task", function(value, element) {
        test_val = $(element).siblings('input[type=hidden]').val();
        return test_val != '';
    }, "Please enter a valid Task");

    jQuery.validator.addMethod("check_matter", function(value, element) {
        test_val = $(element).siblings('input[type=hidden]').val();
        return test_val != '';
    }, "Please enter a valid Matter");


    return $tracker;   
}

$(document).ready(function(){
    $tr = TimeTracker($("#fixedFooter"));
    $tr.initialize();

    //timesheet datatable
    $ttr = TimeTrackingRecords();

    //a neat trick to syn start events in different windows

    $(window).bind("focus", function() {
        //$tr.initialize();
        if(timesheet = $tr.handleCookie('Read')) {
            if(timesheet.recordState != $('form', $tr).data().state) {
                $tr.reload(timesheet);

                if(timesheet.recordState == 'active') {
                    $tr.startTimeTracking();
                }
            }
        }
    });

    //timesheet datatable actions: add / delete / edit ...
    $(document).on('click', '.time-actions',  function(event) {
        action = event.target.title;
        $('#dialogTimeTracking').dialog({title: action});

        switch(action) {
            
            case "Create Timesheet":
                event.preventDefault();

                //check
                if($('#timeTracker form').data().state == "active") {
                    alert('You cannot delete this task while time tracking.');
                    return false;
                }

                addnewTimeTrackForm();
                $("#timeStart, #timeStop").datetimepicker('disable');
                $('#dialogTimeTracking').dialog('open');
                $("#timeStart, #timeStop").datetimepicker('enable');
            break;
            
            case "Delete Timesheet":
                event.preventDefault();

                 //check
                if($('#timeTracker form').data().state == "active") {
                    alert('You cannot delete this task while time tracking.');
                    return false;
                }

                deleteTimeTrackForm(event.target);
                $('#dialogTimeTracking').dialog('open');
            break;

            case "Track Time":
                event.preventDefault();
                var $btn = $(event.target);
                var $frm = $('.timeRecordForm');

                if($btn.is('.glyphicons-play')) {

                    if($frm.data().state == "active") {
                        alert("You are currently time tracking another task.");
                        return false;
                    }
                    retrieveTaskTrackingData(getUrlVars()['recordID'], true);

                } 
                else if($btn.is('.glyphicons-stop')) {
                    $frm.submit();
                }
            break;
        }

    });
    $('#btnDeleteRecord').on('mousedown', function(event) {
        event.stopPropagation();
        if(getUrlVars()['module'] == "Task" && (getUrlVars()['recordID'] == $('#trackingTaskID').val())) {

            if(deleteCheck()) {
               //$tr.handleCookie('Erase');
               //$('#btnDeleteRecord').off();
            }
        }

    });

    // initialize modal form for timesheets
    $('#dialogTimeTracking').dialog({
        autoOpen: false,
        autofocus: false,
        resizable: true,
        width: 330,
        height: 'auto',
        modal: true,
        open: function(event, ui) {
            
        },
        close: function() {
            //unhightlight active row
            $('#dialogTimeTracking form').trigger('change');
        }
    });

    // listen for statechange ie next / prev arrows at t
    if(History.Adapter) {
        History.Adapter.bind(window,'statechange',function(){
            //keep up with record switching
            var State = History.getState();
            recordID = getUrlVars(State.url)['recordID'];
            $ttr.retrieveTimeSheets(recordID);
        });
    }
    
}).ajaxComplete(function(){
    hideTimeTracking();
});

function deleteCheck() {
    if(deleteChk = $tr.handleCookie('Read')) {
        if(deleteChk.recordState == 'active') {
            alert('You cannot delete this task while time tracking.'); 
            return false;
        }
    }
    return true;
}

