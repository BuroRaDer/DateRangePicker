BuroRaDer.DateRangePicker
=========================

This library turns the jQuery UI date picker into a date range picker.

Usage
-----
- Add the jQuery UI Datepicker files to your page.
- Add the BuroRaDer.DateRangePicker.js and BuroRaDer.DateRangePicker.css files
  to your page.
- If you want the date picker to turn into a date range picker, you will have
  to couple 2 inputs to each other using the data attributes:
  * data-date-range-end: attribute on the 1st input, specifying the selector of
    the 2nd input.
  * data-date-range-start: attribute on the 2nd input, specifying the selector
    of the 1st input.
- Initialize the date picker as normal, but only on one of the inputs.
- When the date picker gets shown it will allow you to select a date range,
  thus a begin and end date.
  
Customizing
-----------
This date range picker adds some new settings and changes some defaults that
allow you to influecn its behavior. See the documentation (in
BuroRaDer.DateRangePicker.js) on the BuroRaDer.DateRangePicker object.

Support
-------
Remarks, suggestions, bugs, and feature requests should all go via the github
project https://github.com/BuroRaDer/DateRangePicker.

License
-------
This code is provided under the MIT license, see the file LICENSE.

Author
------
Name:         fietserwin
Organization: Buro RaDer
Website:      http://www.burorader.com/

Credits
-------
This plugin is based on ideas proposed by the various authors and contributors on
- http://stackoverflow.com/questions/16092288/date-range-picker-on-jquery-ui-datepicker
- http://bseth99.github.io/projects/jquery-ui/4-jquery-ui-datepicker-range.html

