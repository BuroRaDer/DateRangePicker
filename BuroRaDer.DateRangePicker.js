(function ($) {
  "use strict";

  // Ensure BuroRaDer is defined.
  window.BuroRaDer = window.BuroRaDer || {};

  /** @typedef {{_get: function,
   *    _getInst: function,
   *   _hideDatepicker: function,
   *   _updateDatepicker: function,
   *   _updateAlternate: function,
   *   getFormatConfig: function,
   *   parseDate: function,
   *   formatDate: function,
   *   _formatDate: function
   *  }}
   */
  window.BuroRaDer.DatePicker; // jshint ignore:line

  /**
   * @constructor
   * @extends {BuroRaDer.DatePicker}
   *
   * lends {DateRangePicker}
   *
   * This code turns the jquery UI date picker into a date range picker to allow
   * to use it to select a date range. It does so by overriding some of the
   * methods, adding some settings, changing the defaults of some settings
   * (including some custom event handlers), some properties to the inst objects
   * that represent a date picker instance, and by adding some styling based on
   * added css classes to the date picker.
   *
   * Some notes:
   * - The overrides will be added to the $.datepicker object itself, allowing
   *   access to the parent implementation via its prototype.
   * - It is expected that a date range is represented by 2 input elements, 1
   *   for the start date, 1 for the end date. they should be linked - and
   *   therefore recognizable as a date range couple - to each other via the
   *   data attributes:
   *   * data-date-range-end: attribute on the 1st input, specifying the
   *     selector of the 2nd input.
   *   * data-date-range-start: attribute on the 2nd input, specifying the
   *     selector of the 1st input.
   * - Only 1 datepicker should be instantiated on 1 of the 2 inputs, the start
   *   input being the most logical one.
   * - When the datepicker gets shown:
   *   * The datepicker is extended with 2 buttons to clear the selected date(s)
   *     and to hide the datepicker.
   *   * The user can select a date as normally.
   *   * However, the datepicker is not hidden but remains active.
   *   * The selected date gets placed in the 1st input and visually marked on
   *     the calendar.
   *   * All dates before the selected date get disabled.
   *   * The user can select a 2nd date.
   *   * The end date gets placed in the 2nd input and the date range gets
   *     visually marked on the calendar
   *   * The datepicker is hidden, so the use will only shortly see the selected
   *     date range.
   *   * If the user activates the datepicker again, it will see the selected
   *     date range.
   *   * It can adapt the end date by clicking on any date after the start date.
   *   * It can clear the selected date(s) via the button.
   *   * The datepicker will no longer hide automatically. The user will have to
   *     click the 'Done' button or press escape.
   *   * Changes made to the date range will continue to be reflected in the 2
   *     inputs
   *   * Changes made to the inputs will be reflected on the calendar when it
   *     gets activated, not when it is active.
   *
   * New settings/defaults:
   * - numberOfMonths: 2 (new default).
   * - changeMonth: true (new default).
   * - changeYear: true (new default).
   * - minRangeDuration: 0 (new setting: positive integer) How many days at
   *     least must the end date be after the start date. 0: same date may be
   *     selected as both start and end date.
   * - isTo1: false (new setting, boolean). Should the end date be inclusive or
   *     not. Set to true for arrival/departure date or overnight allocation use
   *     cases. This property only influences the visual representation of the
   *     date range.
   * - showSplitDay: false (new setting, boolean). Should the date range be
   *     shown as split days on the arrival and end date. Set to true for
   *     arrival/departure date or overnight allocation use cases. This property
   *     only influences the visual representation of the date range.
   * - beforeShowDay: function (new default). This setting represents an event
   *     handler that allows to add classes to the html of each day cell.
   *     Applications that overrule this setting will loose the css class based
   *     styles that visualize a date range.
   * - doneText: Done (new setting, string). The text to use for the 'Done'
   *     button.
   * - clearText: Clear selected date(s) (new setting, string). The text to use
   *     for the 'Clear' button.
   *
   * Internal:
   * New properties on an inst object:
   * - {?Date} rangeStart: The start of the date range
   * - {?Date} rangeEnd: The end of the date range
   * - {String} orgMinDate: The originally set minDate, used to be abel to
   *     restore that when the date range gets cleared.
   * - {HTMLInputElement} inputStart: the input to receive the value for the 1st
   *     date.
   * - {HTMLInputElement} inputEnd: the input to receive the value for the 2nd
   *     date.
   */
  window.BuroRaDer.DateRangePicker = {

    /**
     * Overrides _attachDatepicker to add date range specific settings and
     * setting defaults to the settings object.
     *
     * We recognize a date range picker by data attributes:
     * - data-date-range-end on the start date input element, or
     * - data-date-range-start on the end date input element.
     *
     * @param {HTMLInputElement} target
     * @param {Object} settings
     */
    _attachDatepicker: function (target, settings) {
      // If this input is part of a date range couple we turn the date picker
      // instance into a date range picker.
      var isDateRange = $(target).data("date-range-end") || $(target).data("date-range-start");
      if (isDateRange) {
        // Extend the settings with date range specific settings and defaults.
        settings = $.extend({}, window.BuroRaDer.DateRangePickerSettings, settings || {});
      }
      // Call parent.
      Object.getPrototypeOf(this)._attachDatepicker.call(this, target, settings);

      // The instance object has been created, including its settings property,
      // so we can finish our construction work.
      if (isDateRange) {
        var inst = this._getInst(target);
        inst.orgMinDate = this._get(inst, "minDate");
      }
    },

    /**
     * Extends the _newInst method of the jQuery UI date picker.
     *
     * _newInst gets called by _attachDatepicker() and _dialogDatepicker(),
     * @see BuroRaDer.DateRangePicker._attachDatepicker
     *
     * @param {HTMLInputElement} target
     * @param inline
     *
     * @returns {Object}
     */
    _newInst: function (target, inline) {
      // Call parent.
      var inst = Object.getPrototypeOf(this)._newInst.call(this, target, inline);

      // If this input is part of a date range couple we turn the date picker
      // instance into a date range picker.
      if ($(target).data("date-range-end") || $(target).data("date-range-start")) {
        // Extend the new instance with date range specific properties.
        inst.rangeStart = null;
        inst.rangeEnd = null;
        if ($(target).data("date-range-end")) {
          // Target is the input for the start date. Lookup the input for the
          // end date via a data attribute
          inst.inputStart = target;
          inst.inputEnd = $($(target).data("date-range-end"))[0];
        }
        else {
          // Target is the input for the end date.
          inst.inputEnd = target;
          inst.inputStart = $($(target).data("date-range-start"))[0];
        }
      }

      return inst;
    },

    /**
     * Compares the date portions of 2 date objects.
     *
     * @param {Date} d1
     * @param {Date} d2
     *
     * @returns {number}
     *   -1 if d1 < d2,
     *    0 if d1 = d2,
     *    1 if d1 > d2.
     */
    compareDates: function (d1, d2) {
      if (d1.getUTCFullYear() < d2.getUTCFullYear()) {
        return -1;
      }
      if (d1.getUTCFullYear() > d2.getUTCFullYear()) {
        return 1;
      }
      if (d1.getUTCMonth() < d2.getUTCMonth()) {
        return -1;
      }
      if (d1.getUTCMonth() > d2.getUTCMonth()) {
        return 1;
      }
      if (d1.getUTCDate() < d2.getUTCDate()) {
        return -1;
      }
      if (d1.getUTCDate() > d2.getUTCDate()) {
        return 1;
      }
      return 0;
    },

    /**
     * Determines if the passed in parameter hints at a date range picker
     * instance.
     *
     * We can recognise a date range picker instance when the inst data has
     * 2 inputs define: inoutStart and inputEnd (we ignore the input property).
     *
     * @param {String|HTMLInputElement|jQuery|Object} id
     *   - String: the id of an input element (as a selector, thus prefixed with
     *     a '#').
     *   - HTMLInputElement: an input element.
     *   - jQuery: an input element packed into a jQuery object.
     *   - Object: an inst object that contains date picker instance specific
     *     data.
     *
     * @returns {?Object}
     *   An inst object if this instance is a date range picker, null otherwise.
     */
    isDateRangePicker: function (id) {
      var inst =
        id instanceof Element ? this._getInst(id) :
          id instanceof jQuery ? this._getInst(id[0]) :
            typeof id === "string" ? this._getInst($(id)[0]) :
              id;
      return (inst && inst.inputStart !== undefined && inst.inputEnd !== undefined) ? inst : null;
    },

    /**
     * The datepicker gets shown and is now update for the current instance.
     *
     * This override:
     * - Adds the buttons.
     * - Adds classes to the surrounding div based on extra settings we define.
     *
     * @param {Object} inst
     */
    _updateDatepicker: function (inst) {
      Object.getPrototypeOf(this)._updateDatepicker.call(this, inst);

      inst = this.isDateRangePicker(inst);
      if (inst !== null) {
        // Insert buttons.
        var clear = $('<button type="button" class="ui-state-default ui-priority-primary ui-corner-all" data-handler="reset" data-event="click">' + this._get(inst, "clearText") + '</button>');
        var done = $('<button type="button" class="ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all" data-handler="hide" data-event="click">' + this._get(inst, "doneText") + '</button>');

        done.click(function () {
          $.datepicker._hideDatepicker();
        });
        clear.click(function () {
          $.datepicker._clearDate(inst.input);
        });

        if (this._get(inst, "showSplitDay")) {
          inst.dpDiv.removeClass("date-range-full-day").addClass("date-range-split-day");
        }
        else {
          inst.dpDiv.removeClass("date-range-split-day").addClass("date-range-full-day");
        }
        if (this._get(inst, "isTo1")) {
          inst.dpDiv.removeClass("date-range-is-to").addClass("date-range-is-to1");
        }
        else {
          inst.dpDiv.removeClass("date-range-is-to1").addClass("date-range-is-to");
        }
        inst.dpDiv.append(clear, done);
      }
    },

    /**
     * Override to clear a date.
     *
     * This override:
     * - Clears both dates.
     * - Resets the minDate setting to its original value.
     * - Resets the last selected date as, for this use case, that may be
     *   confusing to the user (as if it is the 1st selected date).
     * - Redraws the calendar to remove the visible clues of the date range.
     *
     * @param {HTMLInputElement} input
     */
    _clearDate: function (input) {
      var inst = this.isDateRangePicker(input);

      if (inst !== null) {
        inst.rangeStart = null;
        $(inst.inputStart).val("");

        inst.rangeEnd = null;
        $(inst.inputEnd).val("");

        // Reset minDate.
        inst.settings.minDate = inst.orgMinDate;

        // Reset selectedDate.
        inst.currentDay = null;
        inst.selectedMonth = null;
        inst.selectedYear = null;
      }

      Object.getPrototypeOf(this)._clearDate.call(this, input);
      this._updateDatepicker(inst);
    },

    /**
     * Updates the date range based on the values in the 2 input fields.
     *
     * @param {Object} inst
     * @param {boolean} noDefault
     */
    _setDateFromField: function (inst, noDefault) {
      Object.getPrototypeOf(this)._setDateFromField.call(this, inst, noDefault);

      inst = this.isDateRangePicker(inst);
      if (inst !== null) {
        var format = this._get(inst, "dateFormat");
        var settings = this._getFormatConfig(inst);

        try {
          this.selectStartDate(inst, this.parseDate(format, $(inst.inputStart).val(), settings));
        }
        catch (e) {
          inst.rangeStart = null;
        }

        try {
          this.selectEndDate(inst, this.parseDate(format, $(inst.inputEnd).val(), settings));
        }
        catch (e) {
          inst.rangeEnd = null;
        }
      }
    },

    /**
     * Executes when the 1st date gets selected.
     *
     * - Set the minDate setting
     * - Store the selected date.
     * - Set the value of the 1st input to the selected date.
     * - Trigger the change event on the 1st input.
     *
     * @param {Object} inst
     * @param {?Date} date
     */
    selectStartDate: function (inst, date) {
      if (date) {
        var format = this._get(inst, "dateFormat");

        // Store 1st date internally.
        inst.rangeStart = new Date(date.getTime());
        // Disable dates before the selected date and less than minRangeDuration
        // days after the selected date.
        var minRangeEnd = new Date(inst.rangeStart.getTime());
        minRangeEnd.setDate(minRangeEnd.getDate() + this._get(inst, "minRangeDuration"));
        inst.settings.minDate = $.datepicker.formatDate(format, minRangeEnd);
        // Place the date into the 1st input element and trigger its change event.
        var oldVal = $(inst.inputStart).val();
        var newVal = $.datepicker.formatDate(format, inst.rangeStart);
        if (newVal !== oldVal) {
          $(inst.inputStart).val($.datepicker.formatDate(format, inst.rangeStart)).change();
        }
      }
      else {
        inst.rangeStart = null;
      }
    },

    /**
     * Executes when the 2nd date gets selected.
     *
     * - Store the 2nd date
     * - Set the value of the 2nd input to the selected date.
     * - Trigger the change event on the 2nd input.
     *
     * @param {Object} inst
     * @param {?Date} date
     */
    selectEndDate: function (inst, date) {
      if (date) {
        var format = this._get(inst, "dateFormat");
        // Store 2nd date internally.
        inst.rangeEnd = new Date(date.getTime());
        // Place the date into the 2nd input element and trigger its change event.
        var oldVal = $(inst.inputEnd).val();
        var newVal = $.datepicker.formatDate(format, inst.rangeEnd);
        if (newVal !== oldVal) {
          $(inst.inputEnd).val($.datepicker.formatDate(format, inst.rangeEnd)).change();
        }
      }
      else {
        inst.rangeEnd = null;
      }
    },

    /**
     * Overrides the _selectDate handler from the datepicker.
     *
     * - We only call the parent implementation when this is not a date range
     *   picker (because the parent unconditionally hides the datepicker).
     * - Redraw the datepicker to visually indicate the date range.
     *
     * @param {String} id
     * @param {?String} dateStr
     */
    _selectDate: function (id, dateStr) {
      var inst = this.isDateRangePicker(id);
      if (inst !== null) {
        var format = this._get(inst, "dateFormat");
        dateStr = (dateStr !== null ? dateStr : this._formatDate(inst));
        var date = this.parseDate(format, dateStr);

        if (date !== null) {
          if (inst.rangeStart === null) {
            this.selectStartDate(inst, date);
          }
          else {
            this.selectEndDate(inst, date);
          }

          // This is also there in the parent code...
          this._updateAlternate(inst);

          // Also from the parent code: we still trigger the custom onSelect, if
          // set, also if the range is not complete yet.
          var onSelect = this._get(inst, "onSelect");
          if (onSelect) {
            onSelect.apply((inst.input ? inst.input[0] : null), [dateStr, inst]);  // trigger custom callback
          }

          // Redraw.
          this._updateDatepicker(inst);
          // And only hide if the range is complete and this is the first time
          // it is complete.
          if (!inst.inline && inst.rangeStart !== null && inst.rangeEnd !== null && !inst.hiddenOnce) {
            inst.hiddenOnce = true;
            this._hideDatepicker();
          }
        }
      }
      else {
        Object.getPrototypeOf(this)._selectDate.call(this, id, dateStr);
      }
    },

    /**
     * Handler to allow to add a class to the table cell for the given date.
     *
     * Note that this function is passed as a setting and is thus not directly
     * called by the datepicker.
     *
     * @this {HTMLInputElement} The input element for this datepicker instance.
     * @param {Date} date
     *
     * @returns {Array}
     *   Array with the values: unselectable, css class[, custom title].
     */
    beforeShowDay: function (date) {
      var cssClass = "";
      if (this) {
        //noinspection JSValidateTypes
        /** @type {BuroRaDer.DateRangePicker} */
        var datepicker = $.datepicker;
        var inst = datepicker.isDateRangePicker(this);
        if (inst !== null) {
          if (inst.rangeStart !== null) {
            if (inst.rangeEnd !== null) {
              // Full date range defined: determine if this date is outside, at
              // an edge or inside the range.
              var compareWithStartDate = datepicker.compareDates(date, inst.rangeStart);
              if (compareWithStartDate > 0) {
                // After start date.
                var compareWithEndDate = datepicker.compareDates(date, inst.rangeEnd);
                if (compareWithEndDate < 0) {
                  // Before end date.
                  cssClass = "date-range-in";
                }
                else if (compareWithEndDate === 0) {
                  // On end date.
                  cssClass = "date-range-end";
                }
              }
              else if (compareWithStartDate === 0) {
                // On start date.
                cssClass = "date-range-start";
              }
            }
            else {
              // Only range start has been defined: determine if this date is
              // the range start.
              cssClass = datepicker.compareDates(date, inst.rangeStart) === 0 ? "date-range-start" : "";
            }
          }
        }
      }
      return [true, cssClass];
    }
  };

  /**
   * Settings that overrule or extend the default settings of the datepicker.
   */
  window.BuroRaDer.DateRangePickerSettings = {
    numberOfMonths: 2,
    changeMonth: true,
    changeYear: true,
    minRangeDuration: 0,
    isTo1: false,
    showSplitDay: false,
    beforeShowDay: window.BuroRaDer.DateRangePicker.beforeShowDay,
    doneText: "Done",
    clearText: "Clear selected date(s)"
  };

  // Extend the singleton datepicker instance with the methods defined above.
  $.extend($.datepicker, window.BuroRaDer.DateRangePicker);

}(jQuery));
