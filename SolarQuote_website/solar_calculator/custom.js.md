https://www.solarquotes.com.au/js/calc/custom.js?1758803059

```js```
/* -------------------------------------------

Name:		Solarquotes.com.au
Date:		2019/06/24
Author:		http://psdhtml.me

---------------------------------------------  */
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
	select_tag = $('select:not(".hidden"):not(".no-semantic")'),

	email_tag = $(document.getElementsByClassName('email')),
	
	Calcs = {
		cost: function(){
			var sum_array = function(total, num){
				return total + num;
			};
			var is_simple = $('body').hasClass('simple-mode-open');
			var system_size = (jQuery('select.sa-system-capacity').map(function(){return parseFloat(jQuery(this).val());}).get()).reduce(sum_array).toLocaleString('en-AU');
			var capacities = jQuery('select.sa-system-capacity').map(function() {
				return $(this).closest('.panel-array').find('select.sa-system-status').val() == 1 ? parseFloat(jQuery(this).val()) : 0; 
			}).get();
			var system_size_new = capacities.length == 0 ? 0 : capacities.reduce(sum_array).toLocaleString('en-AU');
			var battery_cost = parseFloat($('#battery-cost').val().replace(',',''));

			var total_cost;
			if (isNaN(battery_cost) || battery_cost === 0) {
				total_cost = system_size_new * 900;
			} else if (battery_cost > 0) {
				total_cost = battery_cost + system_size_new * 700;
			}

			$('#total-cost:visible').val(total_cost.toLocaleString('en-AU'));

			$('.section-total-capacity').addClass('hidden');
			if($('.panel-array').length > 1){
				$('.section-total-capacity').removeClass('hidden');
				$('.section-total-capacity span').text(system_size);
			}

			$('.section-total-capacity').addClass('hidden');
			if($('.panel-array').length > 1){
				$('.section-total-capacity').removeClass('hidden');
				$('.section-total-capacity span').text(system_size);
			}
		},
		battery: function(){
			var installation_cost = 3000;
			var total_cost = 0;

			if($('select.battery-selection').length == 1){
				var option = $('select.battery-selection').find('option:selected');
				if(!option.length || option.val() === '') {
					return 0;
				}

				var price = parseFloat(option.attr('data-price'));
				if($('#postcode-state').val() == 'SA' && option.attr('data-SA-price') !== undefined) 
					price = parseFloat(option.attr('data-SA-price'));  
				if (isNaN(price) || price == 0) {
					const capacity = $('select.battery-selection').closest('.battery-item').find('[name*=capacity]').val();
					if (capacity != '' && parseFloat(capacity) > 0) price = parseFloat(capacity) * 750;
				}
									
				var cost = parseFloat(installation_cost) + price;
				total_cost += cost;
			} else {
				$('select.battery-selection').each(function(idx, val){
					var option = $(val).find('option:selected');
					if(option.attr('data-price')) {
						var price = parseFloat(option.attr('data-price'));
						if($('#postcode-state').val() == 'SA' && option.attr('data-SA-price') !== undefined) 
							price = parseFloat(option.attr('data-SA-price'));
						if (isNaN(price) || price == 0) {
							const capacity = $(val).closest('.battery-item').find('[name*=capacity]').val();
							if (capacity != '' && parseFloat(capacity) > 0) price = parseFloat(capacity) * 750;
						}
						var cost = parseFloat(installation_cost) + price;
						total_cost += cost;
					}
				});
			}
			return total_cost;
		},
		stateDefaults: function(state){
			var defaults = state_defaults[state];
			var elements = {
				FiT: $('#FiT'),
				kWhCost: $('#kWhCost')
			};

			$.each(elements, function(idx, val){
				var parent = $(this).parents('.ui-slider-a');
				var slider = parent.find('div.slider');
				var suffix = parent.attr('data-suffix');
				var prefix = parent.attr('data-prefix');

				$(this).val(prefix + defaults[idx] + suffix);
				slider.slider("value", defaults[idx]);
				slider.trigger('change');
			});

			$('#annual-bill').val(defaults['annual_bill']);
			var dailyCharge = 0;
			Object.values(defaults['charge']).forEach(function(seasonCharge) {
				dailyCharge += seasonCharge;
			});
			dailyCharge = dailyCharge / 365 * 100;
			$('#daily-charge').val(dailyCharge.toFixed(2));
			
			Calcs.checkFiTRestrictions();
		},
		checkFiTRestrictions: function() {
			const state = $('#postcode-state').val()
			var slider = jQuery('#FiT + div.slider');
			
			var totalSystemSize = 0;
			$("[name^='solararray'].sa-system-capacity").each(function(i,item) {
				const systemSize = parseInt(item.value.replace(" kW", ""));
				totalSystemSize += systemSize;
			})

			if(state == 'WA') {
				if(totalSystemSize > 6.6) {
					// Don't show popup and set fit to 0 twice
					if(waFitPopupShowed) return;
					waFitPopupShowed = true;

					// Set FiT to 0 due to WA restrictions
					$('#FiT').val("0c");
					slider.slider("value", 0);
					slider.trigger('change');
					jQuery('a[data-popup="fit0PopupWA"]').click();
				}
			} else if(state == 'VIC') {
				if(totalSystemSize >= 100) {
					// Don't show popup and set fit to 0 twice
					if(vicFitPopupShowed) return;
					vicFitPopupShowed = true;

					// Set FiT to 0 due to WA restrictions
					$('#FiT').val("0c");
					slider.slider("value", 0);
					slider.trigger('change');
					jQuery('a[data-popup="fit0PopupVIC"]').click();
				}
			}
			
			
		}
	},
	Default = {
		utils: {
			onSubmitForm: function(e){
				const postcode = $('#postcode').val();
				const annualBill = parseFloat($('#annual-bill').val());
				const kWhCost = $('[name="kWhCost"]').val();
				const nem12token = $('#token').val();
				const dnspSelect = $('#dnsp-selection');
				const hasBattery = $('#battery-group select.battery-selection').toArray().some(s => !!$(s).val()?.length);
				const hasNewSolarArray = $('#arrays-container select.sa-system-status').toArray().some(s => [].concat($(s).val()).includes("1"));
				const isShortVersion = $('input[name="calcversion"]').val() == 'short';

				const hasInvalidPostcode = !postcode.match(/\d/g) || postcode.match(/\d/g).join('').length < 3;
				const hasInvalidAnnualBill = isNaN(annualBill) || annualBill < 5;

				const isSimpleMode = document.body.classList.contains('simple-mode-open');

				if (hasInvalidPostcode) {
					e.preventDefault();
					sCalc.highlightError('postcode');
					return;
				}

				// If currently in simple mode
				if (isSimpleMode) {
					if (hasInvalidAnnualBill) {
						e.preventDefault();
						sCalc.highlightError('annual-bill');
						return;
					}

					if (!kWhCost) {
						e.preventDefault();
						sCalc.getPostcodeInfo($('#postcode'), sCalc.stateDefaultsFunction, {
							onFinished: () => $(e.target).submit(),
						});
						return;
					}

					$('export_limit').val(0);
				// If currently in advanced mode
				} else {
					if (!nem12token) {
						e.preventDefault();
						sCalc.highlightError('uploadNem12');
						$('#field-error-msg-uploadNem12')[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
						return;
					} else if (dnspSelect.val() == '' && dnspSelect.find('option').length > 2) {
						e.preventDefault();
						sCalc.highlightError('dnsp-selection');
						dnspSelect[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
						return;
				 	} else if (!hasBattery && !hasNewSolarArray && isShortVersion) {
						 e.preventDefault();
						 sCalc.highlightError('total-cost');
						 return;
					}
				}

				// Update URL before redirect with form data (keep browser go-back values consistent after submitting)
				const formEl = e.target;
				const newData = Default.utils.serializeForm(formEl);
				const url = new URL(window.location.href);
				const json = JSON.stringify(newData);
				const encoded = encodeURIComponent(btoa(json));
				url.searchParams.set('data', encoded);

				window.history.replaceState(null, '', url);

				sCalc.showLoader();
			},
			serializeForm: function(formEl) {
				const formData = new FormData(formEl);
				const result = {};

				for (let [name, value] of formData.entries()) {
				  if (!name) continue;
				  const keys = name.match(/[^\[\]]+/g); // e.g., solararray[1][tilt] => ['solararray', '1', 'tilt']
				  let ref = result;

				  if (name === 'custom-plan') {
					// value = JSON.parse(value)['planData'];
					continue;
				  }
			  
				  keys.forEach((key, index) => {
					if (index === keys.length - 1) {
					  // Last key: assign value
					  if (ref[key] !== undefined) {
						if (!Array.isArray(ref[key])) {
						  ref[key] = [ref[key]];
						}
						ref[key].push(value);
					  } else {
						ref[key] = value;
					  }
					} else {
					  if (ref[key] === undefined) ref[key] = {};
					  ref = ref[key];
					}
				  });
				}
				result['custom-plan'] = $('#custom-plan').val();
				return result;
			},
			mails: function () {
				if (email_tag.length) {
					email_tag.not(':input, div').each(function () {
						$(this).text($(this).text().replace('//', '@').replace(/\//g, '.')).filter('a').attr('href', 'mailto:' + $(this).text());
					});
				}
			},
			done: function () {
				sCalc.done();
				// Align right side battery information to the center battery selection - Desktop only
				if($(window).width() > 768 && $('#battery-selection').length > 0 && $('.arrays-container').children().length){
					let topLH = $('#battery-selection').first().offset().top;
					let topRH = $('#rh-battery').prev().offset().top + $('#rh-battery').prev().height();
					$('#rh-battery').css({'margin-top':(topLH - topRH - 125)});
				}

				$('#FiT + div.slider').trigger('change');
			},
			miscellaneous: function () {
				sCalc.ui.accordions();
				sCalc.ui.bars();
				sCalc.ui.moduleCtas();
			},
			binds: function(){

				sCalc.binds();

				if (!window.location.pathname.includes('/result')) {
					// Manages the switching between Simple and Advanced modes
					const body = document.body;
					const switchLinks = document.querySelectorAll('.switch a#simple'); // todo partial deploy: revert to all switch 
					const calcVersionInput = document.getElementById('calcversion');
					const customPlanDisplayName = document.querySelector('input[name="custom-plan-display-name"]');
			
					function toggleMode(isSimpleMode) {					// Function to toggle mode
						body.classList.toggle('simple-mode-open', isSimpleMode);
		
						switchLinks.forEach(link => link.classList.remove('active')); // Update active link styling
						const activeLink = isSimpleMode
							? document.querySelector('.switch a#simple')
							: document.querySelector('.switch a#advanced');
						activeLink.classList.add('active');
		
						calcVersionInput.value = isSimpleMode ? 'simple' : 'advanced'; // Update hidden input value
		
						// Handle `required` attributes
						if (isSimpleMode) {
							customPlanDisplayName.removeAttribute('required');
						} else {
							customPlanDisplayName.setAttribute('required', 'true');
						}

						const currentUrl = new URL(window.location.href);
						const queryString = currentUrl.search; // includes "?" prefix
						const newBasePath = isSimpleMode ? '/solar-calculator/' : '/solar-calculator/smart/';
						const newUrl = `${newBasePath}${queryString}`;

						if (isSimpleMode) {
							$('select.sa-system-status').each(function () {
								$(this).val("1").trigger('change');
							});
						}
					  
						// Update the address bar
						window.history.pushState(null, '', newUrl);
					}
			
					// Add click event listeners for switching modes
					switchLinks.forEach(link => {
						link.addEventListener('click', evt => {
							evt.preventDefault();
							const isSimpleMode = link.id === 'simple';
							toggleMode(isSimpleMode);
						});
					});

					// todo partial deploy: remove this event entirely
					$('.switch a#advanced').on('click', function(evt){
						evt.preventDefault();
						$('.advanced-coming-soon').after('<div id="switch-animation"></div>');
						$('#switch-animation').height($('#simple').parent().height());
						$('#switch-animation').width('3px');
						$('#switch-animation').css({background: 'var(--sapphire)', 'border-radius': '3px', position: 'absolute', 'z-index': '3', 'opacity' : '0.9'});
						$('#switch-animation').animate({opacity: 1, 'width': ($('#simple').parent().width())+'px'});
						setTimeout(function(){$('.advanced-coming-soon').show(); $('#switch-animation').remove();}, 400);
						setTimeout(function(){
							$('.advanced-coming-soon').fadeOut();
						}, 4000);					
					});
			
					// Initialize mode based on the current state
					const isSimpleMode = body.classList.contains('simple-mode-open');
					toggleMode(isSimpleMode);
				}

				// Handle the NEM12 file uploading
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

				$('#lets-calculate').on('click', function(e){
					e.preventDefault();
					$('html, body').animate({
			        	scrollTop: $('label[for=postcode]').offset().top
			      	}, 800, function(){ $('#postcode').focus(); });
				});

				$('#postcode').on('keyup change', function (e) {
          // if ($(e.target).val().length >= 3) {
            sCalc.getPostcodeInfo($(this), Calcs.stateDefaults, {
							callback: (oldState, newState) => {
                if (oldState != newState) {
                  // If state changes, recalculate battery price
                  var battery_cost = Calcs.battery();
                  $('#battery-cost').val(
                    parseFloat(battery_cost).toLocaleString('en-AU')
                  );
                  Calcs.cost();
                }
              },
            });
          // }
        });

				$('[name="fcb"]').on('change', function(){
					console.log($('[name="fcb"]:checked').val());
				});

				$('.arrays-container').on('change','.sa-system-capacity, .sa-system-status', function(){
					Calcs.checkFiTRestrictions();
					Calcs.cost();
				});

				$('body').on('change keyup', 'select.battery-selection, #battery-cost', function(){
					var battery_cost = 0;
					if($(this)[0].tagName == 'INPUT')
						battery_cost = $(this).val().replace(',','') ? $(this).val().replace(',','') : 0;
					else
						battery_cost = Calcs.battery();
					$('#battery-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
					Calcs.cost();
				});
				$('body').on('change keyup', '.battery-item .custom-battery-fields [name*=capacity]', function(){
					var battery_cost = Calcs.battery();
					$('#battery-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
					Calcs.cost();
				});
				$('body').on('change', 'select.battery-selection', function(e){
					e.stopPropagation();
					var selectedValue = $(this).val();
					var batteryItem = $(this).closest('.battery-item');
					var hideBatteryToggleSection = (selectedValue == '' && $('select.battery-selection').length == 1);
					$('.battery-toggle-section').toggleClass('hidden', hideBatteryToggleSection);
					$('.battery-toggle-section p.link-btn').toggleClass('hidden', $('select.battery-selection').last().val() == '');

					var hideReserveField = $(this).val() == '' || hideBatteryToggleSection;
					batteryItem.find('.battery-reserve-wrapper').toggleClass('hidden', hideReserveField);

					var showCustomFields = selectedValue === 'custom-battery';
					batteryItem.find('.custom-battery-fields').toggleClass('hidden', !showCustomFields);
				});

				$('select.battery-selection').each(function(){
					if($(this).val()!="")
						$('.battery-toggle-section').removeClass('hidden');
				});

				if($('ul.select-battery-selection').length>0) {
					$('<li class="heading">Popular Batteries:</li>').insertBefore('ul.select-battery-selection li[data-value=32]');
				}

				var addArrayQueue = 0;
				$('.add-array').on('click', function(evt){
					evt.preventDefault();
					evt.stopPropagation();
					if($(this).hasClass('disabled')){
						return false;
					}
					addArray();
				});
				function addArray(fromQueue = false) {
					if(!fromQueue) addArrayQueue++;
					if(addArrayQueue > 1 && !fromQueue) return;


					var solarArrayPos = (jQuery('.panel-array').last().data('pos')+1)
					if(solarArrayPos > 10) {
						addArrayQueue = 0;
						return;
					}

					$.ajax({
						url: '/solar-calculator/addArray/',
						data: {
							pos: solarArrayPos
						},
						success:function(html){
							let pArray = $(html);
							if (! is_mobile) {
								pArray.find('select:not(".hidden"):not(".no-semantic")').semanticSelect();
							}
							$('.arrays-container').append(pArray);
							$('.header-toggle').removeClass('hidden');
							sCalc.ui.initSliders();
							calcs.cost();

							calcs.utils.refreshPA('add');
							calcs.checkFiTRestrictions();
						},
						complete: function(){
							addArrayQueue--;
							if(addArrayQueue > 0) addArray(true);
						}
					});
				}

				$('.add-battery').on('click', function(evt){
					evt.preventDefault();
					evt.stopPropagation();
					addBattery();
				});
				// Instead of calling AJAX, clone the last battery (there is always at least one) and update the position identifiers
				function addBattery() {
					$('div#battery-selection p').css('z-index','');
					const lastBattery = $('.battery-item').last();
					const lastPos = parseInt(lastBattery.data('pos'), 10);
					const newPos = lastPos + 1;
				
					const newBattery = lastBattery.clone();
					newBattery.attr('id', 'battery-item-' + newPos).attr('data-pos', newPos);				

					const selectionWrapper = newBattery.find('p.battery-selection');
					const label = selectionWrapper.find('label[for^="battery-selection"]');
					label.attr('for', `battery-selection-${newPos}`);
					label.html(`Battery #${newPos + 1} <a href="#" class="remove-battery">(remove)</a>`);

					const originalSelect = selectionWrapper.find('select').first();
					const cleanSelect = originalSelect.clone()
						.val('')
						.attr('id', `battery.${newPos}.selection`)
						.attr('name', `battery[${newPos}][selection]`)
						.removeClass('hidden')
						.removeAttr('aria-hidden');

					selectionWrapper.find('.semantic-select-wrapper').remove();
					selectionWrapper.find('select').remove();
					selectionWrapper.append(cleanSelect);

					const reserveWrapper = newBattery.find('p.battery-reserve-wrapper');				
					const reserveLabel = reserveWrapper.find('label[for^="battery-reserve"]');
					reserveLabel.attr('for', `battery-reserve-${newPos}`);
					reserveLabel.text(`Battery Reserve #${newPos + 1}`);

					const reserveInput = reserveWrapper.find('input[name^="battery"]').first();
					reserveInput
						.val('20')
						.attr('name', `battery[${newPos}][reserve]`)
						.attr('id', `battery-reserve-${newPos}`);

					// Update custom battery fields
					const capacityInput = newBattery.find('input[name$="[capacity]"]');
					capacityInput
						.val('10')
						.attr('name', `battery[${newPos}][capacity]`)
						.attr('id', `battery-capacity-${newPos}`);

					const capacityLabel = newBattery.find('label[for^="battery-capacity"]');
					capacityLabel
						.attr('for', `battery-capacity-${newPos}`)
						.text(`Usable Battery Capacity #${newPos + 1}`);

					const efficiencyInput = newBattery.find('input[name$="[efficiency]"]');
					efficiencyInput
						.val('90')
						.attr('name', `battery[${newPos}][efficiency]`)
						.attr('id', `battery-efficiency-${newPos}`);

					const efficiencyLabel = newBattery.find('label[for^="battery-efficiency"]');
					efficiencyLabel
						.attr('for', `battery-efficiency-${newPos}`)
						.text(`Battery Efficiency #${newPos + 1}`);

					$('.battery-group').append(newBattery);

					if (!is_mobile) {
						cleanSelect.semanticSelect();
					}
					cleanSelect.val('').trigger('change');
				}

				$('body').on('click', 'a.remove-battery', function(evt){
					evt.preventDefault();
					evt.stopPropagation();
					$(this).closest('.battery-item').remove();
					$('.battery-item').each(function(i,e){
						$(e).attr('id', 'battery-item-' + i).attr('data-pos', i);
					});
					$('label[for*=battery-selection]').each(function(i,e){
						$(this).html('Battery #'+(i+1));
						if(i>0)
							$(this).html('Battery #'+(i+1)+' <a href="#" class="remove-battery">(remove)</a>');
					});
					$('label[for*=battery-reserve]').each(function(i,e){
						$(this).html('Battery Reserve #'+(i+1));
					});
					$('label[for*=battery-capacity]').each(function(i,e){
						$(this).html('Usable Battery Capacity #'+(i+1));
					});
					$('label[for*=battery-efficiency]').each(function(i,e){
						$(this).html('Battery Efficiency #'+(i+1));
					});
					var battery_cost = Calcs.battery();
					$('#battery-cost').val(parseFloat(battery_cost).toLocaleString('en-AU'));
					Calcs.cost();
					var addNewBatteryBtnVisible = ($('div#battery-group > div:last-of-type select').val()=="");
					$('.battery-toggle-section p.link-btn').toggleClass('hidden', addNewBatteryBtnVisible);
				});

				$('.arrays-container').on('click', 'a.toggle', function(evt){
					let pos = $(this).parents('.panel-array').data('pos');
					evt.preventDefault();
					evt.stopPropagation();
					$(this).find('span').toggleClass('hidden').closest('.header-toggle').toggleClass('toggle').nextAll().toggleClass('hide-me');
				});

				$('.arrays-container').on('click', '.remove-array', function(evt){
					evt.preventDefault();evt.stopPropagation();
					$('#panel-array-'+$(this).data('array')).remove();
					calcs.cost();
					if($('.panel-array').length === 1){
						$('.header-toggle').addClass('hidden');
						$('.section-total-capacity').addClass('hidden');
					}

					calcs.utils.refreshPA('remove');
				});

				const planField = $('#custom-plan');
				let plan = null;
				let tariffType = null;
				if (planField.length && planField.val() != '') {
					try {
						plan = JSON.parse(planField.val());
						tariffType = plan.planData['tariffType'];
						if (tariffType == 'TOU') {
							$('.battery-charge-section').removeClass('hidden');
							const batteryChargeMode = $('#battery-charge-mode');
							batteryChargeMode.find('option[value=""]').remove();
							batteryChargeMode.parent().find('li[data-value=""]').remove();
							if (batteryChargeMode.val() == '' || batteryChargeMode.val() == 'solaronly') {
								batteryChargeMode.val('solaronly');
								batteryChargeMode.find('option[value=solaronly]').attr('selected', 'selected');
								batteryChargeMode.trigger('change');
							}
						}
					} catch (error) {
						console.log(error);
					}
				}
				// Hide fit drop checkbox if fit <= 6
				$('#FiT + div.slider').on('change', function(){
					let val = $('#FiT').val().match(/\d/g).join('')
					let check = $('.check:has(.reduce_fit-check)');
					if(val <= 6) {
						check.hide()
					}else{
						check.show()
					}
				})
			},
			// Function that targets specific refresh of the panel arrays
			refreshPA: function(action){
				$('.add-array').toggleClass('disabled',
					$('.arrays-container .panel-array').length >= 10
				);

				$('.panel-array').each(function(idx, elem){
					$(elem).find('.header-toggle span').text(calcs.utils.math.ordinalNumber(idx + 1) + ' Panel Array');
				});

				if($('.panel-array').length > 1){
					$('.panel-array .header-toggle').toggleClass('hidden', false);
				} else if($('.arrays-container .panel-array:first .section').hasClass('hide-me')) {
					$('.header-toggle a').trigger('click');
				}
				// Align right side battery information to the center battery selection - Desktop only
				if($(window).width() > 768){
					let topLH = $('#battery-selection').first().offset().top;
					let topRH = $('#rh-battery').prev().offset().top + $('#rh-battery').prev().height();
						$('#rh-battery').css({'margin-top':(topLH - topRH - 125)});
				}
			},
			math: {
				ordinalNumber: function(n){
					let s = ['th', 'st', 'nd', 'rd'],
						v = n % 100;
					return n + (s[(v - 20) % 10] || s[v] || s[0]);
				}
			},
			init: function(){
				sCalc.ajaxSetup();

				$('#file_label').html($('#nem12-file-name').val()) // Show the file name if it already exists

				// If this is the Solar Calc index page, get the postcode info (use for 3-phase checkbox)
				if (typeof isIndexPage !== 'undefined' && isIndexPage) sCalc.getPostcodeInfo($('#postcode'), () => {})
				
				if(!is_mobile){
					select_tag.semanticSelect();
				}
			}
		}
	};
	setTimeout(function () {
		Default.utils.init();
		Default.utils.mails();
		Default.utils.miscellaneous();
		sCalc.popups();
		sCalc.ui.initSliders();
		sCalc.mobile();
		Default.utils.binds();
		Default.utils.done();
		sCalc.hideLoader();	
	}, 0);

	sCalc.setStateDefaultsFunction(Calcs.stateDefaults);
	$('.form-calculator').on('submit', Default.utils.onSubmitForm);
	window.calcs = Calcs; // Add the Calcs to the window object to be usable in the script.js file
	window.calcs.utils = Default.utils;
});

```js```
