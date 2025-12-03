https://www.solarquotes.com.au/js/calc/battery_calc.js?1751458037

/*global jQuery, document, browser, yall, setTimeout, accounting */
var i = 0,
waFitPopupShowed = false,
vicFitPopupShowed = false,
img_lazy = document.querySelectorAll('img[data-src]:not(.dont)');
for (i = 0; i < img_lazy.length; i = i + 1) {
	img_lazy[i].classList.add('lazy');
}
document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	yall({
		observeChanges: true,
		threshold: 500
	});
});
jQuery(function () {
	"use strict";

	var
	$ = jQuery,

	Calcs = {
		battery: function(){
			var installation_cost = 3000;
			var total_cost = 0;

			var option = $('.sqDropdown.battery-selection .checked');
			var price = parseFloat(option.attr('data-price'));
			if(isNaN(price) || price == 0) {
				const capacity = $('select.battery-selection').closest('.battery-item').find('[name*=capacity]').val();
				if (capacity != '' && parseFloat(capacity) > 0) price = parseFloat(capacity) * 750;
			}

			var cost = parseFloat(installation_cost) + price;
			total_cost += cost;
			return total_cost;
		},
	},
	Default = {
		utils: {
			onSubmitForm: function (e) {
				if($('#postcode').val().match(/\d/g) == null || $('#postcode').val().match(/\d/g).join('').length < 3) {
					e.preventDefault();
					sCalc.highlightError('postcode');
				} else {
					let missingFile = $('#token').val() == '';
					if(missingFile) {
						e.preventDefault();
						sCalc.highlightError('uploadNem12');
					}else{
						sCalc.showLoader();
					}

				}
			},
			binds: function(){

				sCalc.binds();

				$('#postcode').on('keyup change', function(){
					sCalc.getPostcodeInfo($(this), (_) => {}, { callback: (oldState, newState) => {
						if(oldState != newState) { // If state changes, recalculate battery price
							var battery_cost = Calcs.battery();
							if(battery_cost != 0) {
								$('#total-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
							}
						}
					} });
				});

				$('body').on('change keyup', '#total-cost', function(){
					var battery_cost = $(this).val().replace(',','') ? $(this).val().replace(',','') : 0;
					$('#total-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
				});

				$('input.readonly').on('focus', () => document.activeElement.blur()); // Remove focus

				$('#battery-selection').on('change', function(e){
					if (!$('#battery-selection').val()) {
						$('#battery-reserve').addClass('hidden');
						$('.custom-battery-fields').addClass('hidden');
						$('#battery-reserve input').val(0);
					} else {
						var option = $('.sqDropdown.battery-selection .checked');
						
						if (option.attr('data-value') == 'custom-battery') {
							$('.custom-battery-fields').removeClass('hidden');
						} else {
							var battery_cost = Calcs.battery();
							$('#total-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
		
							var reserve = parseFloat(option.attr('data-reserve')) * 100;
							$('#battery-reserve').removeClass('hidden');
							$('#battery-reserve input').val(Math.round(reserve));
							$('.custom-battery-fields').addClass('hidden');
						}

					}
					$(e.target).parent('.sqDropdown').removeClass('opened');
				});

				$('#battery-reserve input').change(function() {
					var value = $(this).val();
					value = parseFloat(value);
					if (value < 0 || value > 100) {
						$(this).val('');
					}
				});


				$('#postcode')[0].addEventListener("invalid", function(){
					$('#postcode')[0].setCustomValidity("Please enter a valid postcode");
				});

				var path = "/webroot/uploadify/";
				if($('#uploadNem12')[0]) {
					$('#uploadNem12').uploadifive({
						'buttonText' : 'Upload NEM12 CSV File',
						'formData' : { 'token' : randomToken ?? '' },
						'width':'auto',
						'height':'auto',
						'fileType' : '.csv',
						'uploadScript' : path + 'uploadify.php',
						'removeCompleted' : true,
						'multi' : false,
						'fileSizeLimit' : '20MB',
						'onError': function(errorType, file) {
							if (errorType === 'FILE_SIZE_LIMIT_EXCEEDED') {
								let maxsizemb = parseInt( ( $(this).data('uploadifive')?.settings?.fileSizeLimit ?? 0 ) / 1024000);
								if (maxsizemb > 0) {
									file.queueItem.find('.fileinfo').html(' - File too large, max size: ' + maxsizemb + 'MB');
								}
							}
						},
						'onUpload' : function(file) {
							$('form .submit button').attr('disabled', true);
						},
						'onAddQueueItem'   : function(file) {
							var validExtensions = ['csv'];
							var fileName = file.name;
							var fileExtension = fileName.split('.').pop().toLowerCase();

							if ($.inArray(fileExtension, validExtensions) === -1) {
								$('#uploadNem12').uploadifive('cancel', file);
								sCalc.highlightError('uploadNem12', 'Invalid file type. Please upload a CSV file.')
								$('#file_label').html('');
								$('#nem12-file-name').val('');
								$('#token').val('');
							}
						},
						'onUploadComplete' : function(file, data) {
							$('#file_label').html(file.name);
							$('#nem12-file-name').val(file.name);
							$('#token').val(data);
							$('.uploadifive-queue-item').remove();
							$('form .submit button').attr('disabled', false);
						}
					});
				}
			
			},

			init: function(){
				sCalc.ajaxSetup();

				$('#file_label').html($('#nem12-file-name').val())

				if($('#battery-reserve input').val() != '') $('#battery-reserve').removeClass('hidden');
				const isCustomBattery = $('#battery-selection').val() == 'My battery isn\'t on this list';
				if (isCustomBattery) {
					$('.custom-battery-fields').removeClass('hidden');
				}
			},
		}
	};
	setTimeout(function () {
		Default.utils.init();
		sCalc.popups(true, true);
		sCalc.mobile();
		Default.utils.binds();
	
		sCalc.done();
		sCalc.hideLoader();	
	}, 0);

	$('.form-calculator').on('submit', Default.utils.onSubmitForm);
	window.calcs = Calcs; // Add the Calcs to the window object to be usable in the script.js file
	window.calcs.utils = Default.utils;
});


