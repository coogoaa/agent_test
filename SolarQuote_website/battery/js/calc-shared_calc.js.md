https://www.solarquotes.com.au/js/calc/shared_calc.js?1753358776

var sCalc;
var postcodeTimeout, lastPostcodeInfo;
let is_mobile = (typeof browser != 'undefined' && browser.mobile) || (typeof is_device != 'undefined' && is_device) || navigator.userAgent.indexOf('iPad') !== -1 || (window.devicePixelRatio && $(window).width() <= 1200); // Specific iPad condition to target those that aren't catched by the 2 previous checks
let list_progress = $(document.getElementsByClassName('list-progress'));
let html_tag = $(document.documentElement);

// Mapping of distributor names to export limits (in kW)
const exportLimitRates = {
	'Essential Energy': { single: 5, three: 5 },
	'Ausgrid': { single: 10, three: 30 },
	'Endeavour Energy': { single: 5, three: 30 },
	'Energex': { single: 5, three: 15 },
	'Ergon Energy': { single: 5, three: 15 },
	'Evoenergy': { single: 5, three: 15 },
	'CitiPower': { single: 5, three: 15 },
	'PowerCor': { single: 5, three: 15 },
	'Jemena': { single: 5, three: 15 },
	'AusNet Services': { single: 5, three: 15 },
	'United Energy': { single: 5, three: 15 },
	'TasNetworks': { single: 10, three: 30 },
	'SA Power Networks': { single: 10, three: 30 },
	'Western Power': { single: 5, three: 30 },
	'Horizon Power': { single: 5, three: 15 },
	'PowerWater': { single: 5, three: 7 }
};
let lastSolarDistributor = null; // Store the last solarDistributor for use in the checkbox handler

jQuery(function () {
	"use strict";
	var
	$ = jQuery;

	let loadRes = function (u, c, i) {
		if (html_tag.is('.' + i)) {
			c();
			return true;
		}
		var s = document.createElement('script');
		s.src = u;
		s.async = true;
		s.onload = c;
		document.body.appendChild(s);
		html_tag.not('.' + i).addClass(i);
		return true;
	};

	sCalc = {
		stateDefaultsFunction: {},
		showLoader: function (showSafari = false) {
			// If safari on Mac don't show loading animation
			if(!showSafari && navigator.userAgent.indexOf('Macintosh') !=-1 && navigator.userAgent.indexOf('Safari') !=-1 && navigator.userAgent.indexOf('Chrome') == -1)
			return true;
			$('#root').css('filter', 'blur(3px)');
			$('#loader').show();
		},
		getPostcodeInfo: function (elem, updateStateDefaults, options = {}) {
			clearTimeout(postcodeTimeout);
			if(elem.val().length < 3)
				return;
			postcodeTimeout = setTimeout(function(){
				$('#postcode-lat').val('');
				$('#postcode-lon').val('');
				$.ajax({
					url: '/solar-calculator/postcodeInformation/',
					data: {
						postcode: elem.val()
					},
					success: function(result){					
						// fix multiple requests bug		
						if(lastPostcodeInfo == elem.val()) return;
						lastPostcodeInfo = elem.val();		
						$('#postcode-text').text(elem.val());
																				
						$('#postcode-lat').val(result.response.lat);
						$('#postcode-lon').val(result.response.lon);

						$('#postcode').get(0).setCustomValidity("");
						
						var oldState = $('#postcode-state').val()
						$('#postcode-state').val(result.response.state);
						if(options.callback != undefined) options.callback(oldState, result.response.state);

						// Update state defaults
						if (typeof updateStateDefaults === 'function') {
							updateStateDefaults(result.response.isEnergex ? 'Energex' : result.response.state);
						}

						let distributorName = null;
						const dnspSelect = $('#dnsp-selection');
						const dnspPostcode = dnspSelect.data('postcode') ?? -1;
						// Prevents override on load when there is an existing data parameter
						if (dnspPostcode == elem.val() && dnspSelect.val() != '') {
							distributorName = dnspSelect.val();
							lastSolarDistributor = distributorName;
						} else {
							dnspSelect.data('postcode', elem.val());
							dnspSelect.val('').empty();
							// Set export limit based on solarDistributor and phase type
							const distributors = result.response.solarDistributors;

							// Prevents error on no-data postcodes
							if (distributors != null && dnspSelect.length > 0) {
								// Also do not show the DNSP selection if they all map to the same export limits.
								const distributorsHaveSameLimit = (() => {
									if (!Array.isArray(distributors) || distributors.length <= 1) return false;
									const ref = exportLimitRates[distributors[0]];
									if (!ref) return false;
									return distributors.every(d => {
										const lim = exportLimitRates[d];
										return lim && lim.single === ref.single && lim.three === ref.three;
									});
								})();

								if (distributors.length == 1 || distributorsHaveSameLimit) {
									distributorName = distributors[0];
									lastSolarDistributor = distributorName; // Store for use in checkbox handler
									dnspSelect.closest('.semantic-select-wrapper').parent('.double-flex').addClass('hidden');
									const option = document.createElement('option');
									option.value = distributorName;
									option.textContent = distributorName;
									dnspSelect.append('<option value="">Select your DNSP</option>');
									dnspSelect[0].appendChild(option);
								} else {
									dnspSelect.append('<option value="">Select your DNSP</option>');
									distributors.forEach(function(name) {
										const option = document.createElement('option');
										option.value = name;
										option.textContent = name;
										dnspSelect[0].append(option);
									});
									const dnspString = distributors.length === 2 
										? `either ${distributors.join(' or ')}`
										: `${distributors.slice(0, -1).join(', ')}, or ${distributors.at(-1)}`;
									$('#dnsp-text').text(dnspString);

									const semanticSelectWrapper = dnspSelect.closest('.semantic-select-wrapper');
									if (semanticSelectWrapper.length) {
										semanticSelectWrapper.parent('.double-flex').removeClass('hidden');
										semanticSelectWrapper.replaceWith(dnspSelect);
										dnspSelect.semanticSelect();
									} else {
										if (is_mobile) {
											dnspSelect.parent('.double-flex').removeClass('hidden');
										} else {
											dnspSelect.semanticSelect();
										}
									}
								}
							}
						}
						dnspSelect.on('change', function () {
							lastSolarDistributor = $(this).val();
							// Determine phase type based on checkbox (checked = three-phase, unchecked = single-phase)
							const isThreePhase = $('#three_phase').is(':checked');
							const phaseKey = isThreePhase ? 'three' : 'single';

							// Use the mapped export limit or default to 5 kW if not found
							const distributorLimits = $(this).val() != null ? exportLimitRates[$(this).val()] : null;
							if (distributorLimits && distributorLimits[phaseKey]) {
								$('#export-limit').val(distributorLimits[phaseKey]);
							}
						});

						// Determine phase type based on checkbox (checked = three-phase, unchecked = single-phase)
						const isThreePhase = $('#three_phase').is(':checked');
						const phaseKey = isThreePhase ? 'three' : 'single';

						// Use the mapped export limit or default to 5 kW if not found
						const distributorLimits = distributorName != null ? exportLimitRates[distributorName] : null;
						const exportLimit = distributorLimits ? distributorLimits[phaseKey] : 5 * (isThreePhase ? 3 : 1); // default to 5 kW, 15kW to three-phase
						// Keep old export limit if it was manually entered at some point
						const exportLimitData = $('#export-limit').data('value');	
						const newExportLimit = exportLimitData ? exportLimitData : exportLimit;
						$('#export-limit').val(newExportLimit).data('value', null);

						if(options.onFinished != undefined) options.onFinished();
					},
					error: function(){
						$('#postcode').get(0).setCustomValidity("Please enter a valid postcode");
					}
				});
			}, 500);
		},
		ajaxSetup: function () {
			$.ajaxSetup({
				headers : {
					'X-CSRF-Token': $('[name="_csrfToken"]').val()
				}
			});
		},
		mobile: function () {
			if (is_mobile) {
				html_tag.addClass('mobile');
			} else {
				html_tag.addClass('no-mobile');
			}
		},
		hideLoader: function () {
			setTimeout(function(){
				$('#loader').hide();
				$('#root').css('filter', 'none');
			}, 500);	
		},
		onSubmitForm: function(e){
			const hasBattery = $('#battery-group select.battery-selection').toArray().some(s => !!$(s).val()?.length);
			const hasNewSolarArray = $('#arrays-container select.sa-system-status').toArray().some(s => [].concat($(s).val()).includes("1"));
			const isShortVersion = $('input[name="calcversion"]').val() == 'short';
			
			if($('#postcode').val().match(/\d/g) == null || $('#postcode').val().match(/\d/g).join('').length < 3) {
				e.preventDefault();
				sCalc.highlightError('postcode');
			} else if(isNaN(parseFloat($('#annual-bill').val())) || parseFloat($('#annual-bill').val()) < 5) {
				e.preventDefault();
				sCalc.highlightError('annual-bill');
			} else if($('[name="kWhCost"]').val() == '') {
				sCalc.getPostcodeInfo($('#postcode'), sCalc.stateDefaultsFunction, { onFinished: () => $(e.target).submit() });
				e.preventDefault();
			} else if($('#dnsp-selection').val() == '' && $('#dnsp-selection option').length > 2) {
				e.preventDefault();
				sCalc.highlightError('dnsp-selection');
			} else if (!hasBattery && !hasNewSolarArray && !isShortVersion) {
				e.preventDefault();
				sCalc.highlightError('total-cost');
			} else
				sCalc.showLoader();
		},
		binds: function() {

			$('body').on('keyup', 'input[type="text"], input[type="tel"]', function(){
				if(!$(this).hasClass('user-changed'))
					$(this).addClass('user-changed');
			});

			$(window).on("scroll", function() {
				var fromTop = $(window).scrollTop();
				$("body").toggleClass("down", (fromTop > 320));
			});

			$('#three_phase').on('change', function () {
        // If no distributor has been set yet (e.g., no postcode entered), do nothing
        if (!lastSolarDistributor) return;

        // Determine phase type based on checkbox
        const isThreePhase = $(this).is(':checked');
        const phaseKey = isThreePhase ? 'three' : 'single';

        // Use the mapped export limit or default to 5 kW if not found
        const distributorLimits = exportLimitRates[lastSolarDistributor];
        const exportLimit = distributorLimits ? distributorLimits[phaseKey] : 5;
        $('#export-limit').val(exportLimit);
    	});

			// lock sliders path (not the handle) for mobile devices
			if((('ontouchstart' in window)
				|| (navigator.MaxTouchPoints > 0)
				|| (navigator.msMaxTouchPoints > 0))) {
					$('.ui-slider-horizontal').preBind('touchstart', function(e){if(e.touches[0].target.children.length!=1) jQuery( ".slider" ).slider({disabled: true}); else jQuery( ".slider" ).slider({disabled: false});});
		  	}
		},
		highlightError: function(field, msg = null) {
			$('#'+field).addClass('with-error');
			$('#'+field).focus();
			$('#field-error-msg-'+field).show();
			let timeoutTime = $('#field-error-msg-'+field).is('longer-time') ? 5000 : 3000;

			if(msg != null) {
				$('#field-error-msg-'+field).html(msg);
			}
			setTimeout(function(){
				$('#'+field).removeClass('with-error');
				$('#field-error-msg-'+field).hide();
			}, timeoutTime);
		},
		setStateDefaultsFunction: function(funct) {
			sCalc.stateDefaultsFunction = funct;
		},
		popups: function (preload=false, disableAnchors = false) {
			var loadPopup = function (id) {
				loadRes('/js/calc/popup.js', function () {
					if ($.fn.semanticPopup !== undefined) {
						var cde = $(document.querySelectorAll('[class^="popup-"]:not(html)'));
						if (cde && !html_tag.is('.spi')) {
							cde.semanticPopup(!disableAnchors);
						}
						$.openPopup(id);
					}
				}, 'popup-loaded');
			},
			dt = decodeURIComponent(document.location.hash.substring(1));
			$('body').on('click', 'a[data-popup]', function (e) {
				loadPopup($(this).attr('data-popup'));
				return false;
			});
			if (document.location.hash.length) {
				if (dt) {
					loadPopup(dt.replace(/^\!/, ''));
				}
			}

			if(preload) {
				loadPopup(preload);
			}
		},
		done: function() {
			var tag = document.createElement('script');
			tag.src = "/js/calc/scripts-async.js";
			document.body.appendChild(tag);
		},

		/* result pages */
		mails: function () {
			if (email_tag.length) {
				email_tag.not(':input, div').each(function () {
					$(this).text($(this).text().replace('//', '@').replace(/\//g, '.')).filter('a').attr('href', 'mailto:' + $(this).text());
				});
			}
		},
		// Create/fill the bars on the "Your Bills" module, add credit labels, etc
		refreshModuleResults: function(result, options = {}) {

			let creditLabel = options.creditLabel || 'CR';
			let has_battery = options.has_battery || false;

			var _values = [];
			$.each(result.savings, function(season, savings){
				if(seasons.indexOf(season)>=0) {
					_values.push(parseFloat($('#' + season + "-savings li#before").attr('data-val')));

					if(! seasons.includes(season))
						return;

					var after = Math.abs(savings.after);
					var before = Math.abs(savings.before);

					var is_credit = savings.after < 0;
					var after_dom_element = $('#' + season + "-savings #after");
					after_dom_element.attr('data-val', Math.round(after))
					.parent().prev().html('<sup>$</sup>' + Math.round(after).toLocaleString() + ( is_credit ? `<span> ${creditLabel}</span>` : ''));

					after_dom_element.find('.bar > div')
						.text(accounting.formatMoney(after, '$', 0));
					after_dom_element.find('.bar').toggleClass('is-credit', is_credit);

					var is_credit = savings.before < 0;
					var before_dom_element = $('#' + season + "-savings #before")
					before_dom_element.attr('data-val', Math.round(before));

					before_dom_element.find('.bar > div')
						.text(accounting.formatMoney(before, '$', 0));
					before_dom_element.find('.bar').toggleClass('is-credit', is_credit);

					_values.push(after);


					if(has_battery){
						is_credit = savings.battery < 0;
						var after_battery = Math.abs(savings.battery);
						var battery_dom_element = $('#' + season + "-savings #battery");

						battery_dom_element.find('.bar > div')
						.text(accounting.formatMoney(after_battery, '$', 0));
						battery_dom_element.attr('data-val', Math.round(after_battery));
						battery_dom_element.parent().prev().html('<sup>$</sup>' + Math.round(after_battery).toLocaleString() + ( is_credit ? '<span> CR</span>' : ''));
						battery_dom_element.find('.bar').toggleClass('is-credit', is_credit);

						_values.push(after_battery);
					}
				}
			});
			$.each(result.savings, function(season, savings){
				var current_max = $('#' + season + "-savings").data('max') == undefined ? 0 : $('#' + season + "-savings").data('max');
				if( current_max < Math.max(..._values)){
					var max = Math.max(..._values);
					$('#' + season + "-savings").data('max', max);

					$('#'+season+'-savings li').each(function(idx, elem){
						var val = $(elem).attr('data-val');
						var of = $(elem).attr('data-of', max);

						$(elem).find('.bar > div')
						.css('width', (( val / max ) * 100) + '%' );
					});
				} else {
					$('#'+season+'-savings li').each(function(idx, elem){
						var val = $(elem).attr('data-val');
						var of = $(elem).attr('data-of');

						$(elem).find('.bar > div').css('width', (( val / of ) * 100) + '%' );
					});
				}
			});
		},
		encodeDataUrl: (data) => encodeURI(btoa(JSON.stringify(data))),
		decodeDataUrl: (data) => JSON.parse(atob(decodeURIComponent(data))),
		initShareLink: function(options = {}){
			let solarCalc = options.solarCalc || false;
			let batteryCalc = options.batteryCalc || false;
			let solarTaxCalc = options.taxCalc || false;
			let swhCalc = options.swhCalc;

			$('#sharelink').hide();
			$('#share-btn').on('click', function(e){
				let $ = jQuery;
				e.preventDefault();
				$('#share-btn').hide();
				$('#sharelink').show();
				let editCode = $('#share-btn').data('code');

				if (swhCalc) {
        } else if (!solarTaxCalc) {
          editCode = sCalc.decodeDataUrl(editCode);
          if (energyPlan && energyPlan.offerId)
            editCode['energyPlanId'] = energyPlan.offerId;
          if (solarCalc)
            editCode['customSelfConsumption'] = $('#self-consumption-slider .slider').slider('value');
          editCode['customInflation'] = $('#inflation-slider .slider').slider('value');
          editCode = sCalc.encodeDataUrl(editCode);
        }

				var controller = 'solar-calculator';
				var action = 'share';
				if(batteryCalc) controller = 'battery-storage/calculator';
				if(solarTaxCalc) {
					controller = 'tools';
					action = 'share_sun_tax';
				}
				if (swhCalc) {
					controller = 'tools';
					action = 'share_ashp_stc_calculator';
				}
				$.ajax({
					url: `https://${window.location.host}/${controller}/${action}/?data=${editCode}`,
					success: function(r){
						$('#sharelinkhelper').hide();
						$('#sharelink').val(r.url);
						var copyText = document.getElementById("sharelink");
						copyText.select();
						copyText.setSelectionRange(0, 99999);
						if(document.execCommand("copy")) {
							$('#sharelinkhelper').html('Copied to clipboard!');
							setTimeout(function(){$('#sharelinkhelper').slideUp();}, 1500);
						}
						else
							$('#sharelinkhelper').html('Click to copy');
						$('#sharelinkhelper').slideDown();
					}
				});		
			});
			$('#sharelink, #sharelinkhelper').on('click', function(){
				var copyText = document.getElementById("sharelink");
				copyText.select();
				copyText.setSelectionRange(0, 99999);		
				if(document.execCommand("copy"))
					$('#sharelinkhelper').html('Copied to clipboard!');
				else
					$('#sharelinkhelper').html('Unable to copy to clipboard');
				$('#sharelinkhelper').slideDown();
				setTimeout(function(){$('#sharelinkhelper').slideUp();}, 3000);
			});
		},
		initEmailBtn: function(options = {}){
			let batteryCalc = options.batteryCalc || false;
			$('#email-btn').on('click', function(evt){
				var $ = jQuery;
				var elem = $(this);
				evt.preventDefault();
				evt.stopPropagation();
				if(! $('#email').is(':visible')){
					$('#email, #email-newsletter').slideDown();
					$('#email-btn span')
					.text('Send');
					$(this).on('click', function(){
						if(document.getElementById('email').checkValidity()){
							$('.input.email, #email-newsletter').slideUp();
							$(elem).html("Sending...");
							setTimeout(function(){
								$(elem).html("Email sent!"); 
								$(elem).css({cursor: 'default', 'background-color': 'var(--squeeze)', color: 'var(--sapphire)', border: 'none'});
							},1500);
							$(elem).css({cursor: 'default'});
							setTimeout(function(){$(elem).slideUp();}, 5000);
							let editCode = $('#cInfo').val();
							editCode = JSON.parse(atob(decodeURIComponent(editCode)));
							editCode['customInflation'] = $('#inflation-slider .slider').slider('value');
							if(!batteryCalc) editCode['dailyCharge'] = variables.dailyCharge.toFixed(2) + 'c';
							editCode['energyPlan'] = energyPlan;
							editCode = encodeURI(btoa(JSON.stringify(editCode)));

							var controller = 'solar-calculator';
							if(batteryCalc) controller = 'battery-storage/calculator';
							$.ajax({
								url: `/${controller}/sendReport/`,
								method: 'post',
								data: {
									newsletter: $('#checkbox-newsletter').is(':checked'),
									info: editCode,
									email: $('#email').val(),
									params: {
										sc: $('#self-consumption').val(),
										inflation: $('#inflation').val(),
										planBurb: $('#energyPlanBurb').html(),
										summary1: $('.summary > div:nth-child(1)').html(),
										summary2: $('.summary > div:nth-child(2)').html(),
										systemType: $('input[name="system_type"').val() ?? 'default',
									},
									bills: values.years[0].savings
								},
								success: function(){}
							})
						} else {
							$('#email').addClass('error');
						}
					});
				}
			});
		},
		initBtnEdit: function(){
			$('body').on('click', '.btn-edit-inputs', function(e){
				e.preventDefault();
				showLoader();
				window.location.href = jQuery('#btn-edit-inputs a').prop('href');
			});
		},	
		detailedPayback: function(year, aggSavings, currentYearSavings, total = total_cost){
			var monthlyAvg = currentYearSavings / 12;
			var months = Math.ceil(( total - aggSavings ) / monthlyAvg);
			console.log(months);
			if (months < 0) {
				debugger;
			}
			if (months == 0){
				return {string: (year) + (year>1 ? " yrs" : " yr"), years: year, months: months, monthsNumber: year * 12};
			} else if(months>=12) {
				return {string: (year + 1) + (year>0 ? " yrs": " yr"), years: (year + 1), months: 0, monthsNumber: (year + 1)*12};
			}
			return {string: (year) + (year>1 ? " yrs, ": " yr, ") + months + " mth" + (months>1?"s":""), years: (year), months: months, monthsNumber: ((year)*12) + months};
		},

		// This is intended for the solar calculators only (/solar-calculator and /p-solar-calc)
		solarCalc: {
			// Calculates Yearly Values - Year 0 is the First Year
			calculateYearlyValues: function(values, year, options = {}){
				var seasons = ['summer', 'autumn', 'winter', 'spring'];
				let forceSelfC = options.forceSelfC ?? false;
				let _energyPlan = options.energyPlan ?? undefined; // if an energy plan wasn't specified, use the selected one
				let changeHTML = options.changeHTML ?? true; // set changeHTML to false if it should only calculate the values, but not change the UI
				let currentSelfC = options.currentSelfC;
				let has_battery = options.has_battery ?? false;
				let infl = options.infl ?? 0;

				if(forceSelfC === false) {
					var selfC = currentSelfC / 100;
					if(isNaN(selfC))
						selfC = variables.selfC / 100; // Grab default
				} else {
					var selfC = forceSelfC/100;
				}


				var result = {};
				var v = variables;
				// If reduce_fit is checked, reduce it by one per year. If it gets smaller than 6 cents, set it to 6
				let _iFitCents = (_energyPlan !== undefined ? _energyPlan.fit : v.FiT)
				var FiT_value = (_iFitCents - (v.reduce_fit ? year : 0)) / 100;
				if(v.reduce_fit && FiT_value < 0.06) FiT_value = _iFitCents > 6 ? 0.06 : _iFitCents/100;
				let seasonCharge = _energyPlan ? _energyPlan.charge : v.charge;

				// Account for Inflation
				var year_savings = 0;
				var before_total = 0;
				var sc_total = 0;
				var exported_total = 0;
				var year_after_solar_savings = 0;
				var bat_selfc_year = 0;
				var result = {
					savings: {
						summer: {}, autumn: {}, winter: {}, spring: {}
					}
				};

				// Self consumption season weights {summer: 0.98,autumn: 0.78,winter:1.45,spring:0.78}
				var seasonSC = {
					summer: selfC * variables.state_defaults.self_consumption_ratio['summer']/variables.selfC,
					autumn: selfC * variables.state_defaults.self_consumption_ratio['autumn']/variables.selfC,
					winter: selfC * variables.state_defaults.self_consumption_ratio['winter']/variables.selfC,
					spring: selfC * variables.state_defaults.self_consumption_ratio['spring']/variables.selfC
				};

				// Inverter replacement after 12 years
				var inverter_size = Math.ceil(parseFloat(total_capacity) / variables.dc_ac_ratio);
				if(year == 12-1) {
					var watts = inverter_size * 1000;
					inverterReplacementCost = watts * variables.inverter_cost_per_watt * (Math.pow(1+infl, 12));
					inverterReplacementInflation = inverterReplacementCost - watts * variables.inverter_cost_per_watt;
					year_savings -= inverterReplacementCost;
					year_after_solar_savings -= inverterReplacementCost;
				}

				$.each(seasons, function(idx, season){

					selfC = seasonSC[season];

					var state_cost = v.kWh_cost;

					// calculate the final usage charge for the energy plan, according to this season kWh import
					if(_energyPlan !== undefined) {
						let usageValues = _energyPlan.usageCharge;

						var days = variables.days_in_season[season];
						var dailyUsage = v.usage[season] / days;
						
						let dailySelfC = Math.min((v.generated_season[season] * selfC)/days, dailyUsage);
						let daily_kwh_imported = dailyUsage - dailySelfC;

						if(usageValues.type === undefined || usageValues.type == 'singleTariff')
							state_cost = usageValues.data[0]['rate']; //use the only value
						else {
							let threshold = usageValues.data[0]['volume'];
							let usageThreshold = Math.round(threshold*10)/10;
							if(usageValues.period == 'M')
								usageThreshold = usageThreshold/30; // from monthly to daily
							else if(usageValues.period == 'Y')
								usageThreshold = usageThreshold/365; // from yearly to daily

							state_cost = usageValues.data[0]['rate'];
							if(daily_kwh_imported > usageThreshold) {
								state_cost = ((state_cost * usageThreshold) + ((Math.round(usageValues.data[1]['rate']*10)/10) * (daily_kwh_imported - usageThreshold))) / daily_kwh_imported;
							}
						}
					}

					state_cost /= 100;
					state_cost = state_cost * ( Math.pow(1+infl, year)); // account for inflation

					var st = {}; // Season tmp
					st.days_in_season = v.days_in_season[season];

					if(year!=0){ //usage must not change from one year to the next
						st.usage = values.years[(year-1)].savings[season].usage;
					} else st.usage = v.usage[season];

					st.pre_solar_bill = Math.round(seasonCharge[season] + ( st.usage * state_cost));

					// Pre solar bill doesn't change anymore, so define bar here
					if(year==0 && changeHTML)
						$('#' + season + "-savings #before")
						.attr('data-val', Math.round(st.pre_solar_bill))
						.find('.bar > div')
						.text(accounting.formatMoney(st.pre_solar_bill, '$', 0));

					st.selfc = Math.min(v.generated_season[season] * selfC, st.usage);
					if(v.generated_season[season] * selfC >= st.usage) {
						values.maxSelfC[season] = st.usage/v.generated_season[season];
					}
					st.savings_selfc = ( st.selfc * state_cost );
					st.grid_use = st.usage - st.selfc;
					st.grid_cost = st.grid_use * state_cost;
					st.exported = v.generated_season[season] - st.selfc;
					st.FiT = st.exported * FiT_value;
					st.savings = st.FiT + st.savings_selfc;
					year_after_solar_savings += st.savings;
					result.savings[season].usage = st.usage;

					result.savings[season].before = st.pre_solar_bill;
					result.savings[season].after = st.grid_cost + seasonCharge[season] - st.FiT ;
					result.savings[season].exported = st.FiT;
					result.savings[season].direct = st.savings_selfc;
					result.savings[season].total = st.pre_solar_bill - st.savings;
					result.savings[season].grid_cost = st.grid_cost;
					result.savings[season].charge = seasonCharge[season];
					result.savings[season].fit = st.FiT;

					if(has_battery){
						// Pre-calculate battery efficiency both ways
						var roundTripEff = variables.battery['data-efficiency'] ?? 0.9;
						var chargeEff = Math.sqrt(roundTripEff);
						var dischargeEff = Math.sqrt(roundTripEff);

						var bat = {}; // battery temp
						bat.capacity = st.days_in_season * (variables.battery['data-capacity'] * (1 - variables.battery['data-reserve']));
						// Take into account the losses when charging and discharging
						var storable_energy = st.exported * chargeEff;
						bat.available = Math.min(bat.capacity, storable_energy);
						var usable_energy = bat.available * dischargeEff;
						bat.selfc = Math.min(usable_energy, st.grid_use);

						bat.grid_use = st.grid_use - bat.selfc;
						bat.grid_cost = bat.selfc * state_cost;
						// Energy losses would otherwise be exported, so account for them here too.
						bat.exported = st.exported - (bat.available / chargeEff);
						bat.imports = bat.grid_use * state_cost;
						bat.export_earnings = bat.exported * FiT_value;
						bat.savings_selfc = bat.selfc * state_cost;
						bat.bill = ( st.days_in_season * ( variables.dailyCharge / 100 ) ) + bat.imports - bat.export_earnings;
						bat.self_kwh = bat.selfc + st.selfc;
						bat_selfc_year += bat.self_kwh;
						bat.savings = bat.savings_selfc + st.savings_selfc +  bat.export_earnings;
						result.savings[season].battery = bat.bill;
						// Update base values when using battery
						st.savings = bat.savings;
						st.savings_selfc = bat.savings_selfc + st.savings_selfc + bat.export_earnings - bat.imports;
						st.FiT = bat.export_earnings;
					}
					year_savings += st.savings;
					sc_total += st.savings_selfc;
					exported_total += st.FiT;

					if(forceSelfC === false && _energyPlan === undefined && year == 0 && ! $('body').data('ran')){
						if(season == 'spring')
							$('body').data('ran', true);
						if(season == 'summer')
							console.log(variables.state);
						console.log('################' + season.toUpperCase() + '################');
						console.log('Season Self Consumption Weighted for Season: ' + selfC);
						console.log('Days in Season: ' + st.days_in_season);
						console.log('Season Usage: ' + st.usage);
						console.log('Pre Solar Bill: ' + st.pre_solar_bill);
						console.log('Self Consumption: ' + st.selfc);
						console.log('Self Consumption Savings: ' + st.savings_selfc);
						console.log('Grid Use: ' + st.grid_use);
						console.log('Grid Cost: ' + st.grid_cost);
						console.log('Exported: ' + st.exported);
						console.log('FiT: ' + st.FiT);
						console.log('Savings: ' + st.savings);
						console.log('Season Savings Before: ' + result.savings[season].before);
						console.log('Season Savings After: ' + result.savings[season].after);
						console.log('Season Savings Exported: ' + result.savings[season].exported);
						console.log('Season Savings Direct: ' + result.savings[season].direct);
						console.log('Season Savings Total: ' + result.savings[season].total);
						if(variables.battery != ''){
							console.log('Battery Debug Info');
							var battery_debug = {};
							battery_debug['Capacity:'] = bat.capacity;
							battery_debug['Energy Available'] = bat.available;
							battery_debug['Self Consumption'] = bat.selfc;
							battery_debug['Grid Use'] = bat.grid_use;
							battery_debug['Grid Cost'] = bat.grid_cost;
							battery_debug['Exports'] = bat.exported;
							battery_debug['Imports'] = bat.imports;
							battery_debug['Export Earnings'] = bat.export_earnings;
							battery_debug['Self Consumption Savings'] = bat.savings_selfc;
							battery_debug['Bill'] = bat.bill;
							battery_debug['Self Consumption kWh'] = bat.self_kwh;
							battery_debug['Savings'] = bat.savings;
							console.log('Battery Debug Info', battery_debug);
						}

						if(season == 'spring'){
							console.log('Extra Debug Info');
							console.log(debug);
						}
					}
				});

				result.savings.year = Math.round(year_savings);
				result.savings.year_after_solar = Math.round(year_after_solar_savings);
				result.savings.year_before = Math.round(before_total);
				result.savings.year_sc = Math.round(sc_total);
				result.savings.year_exported = Math.round(exported_total);		

				if(changeHTML && year == 0 && has_battery){ // bat selfC is output, not input
					var ui_selfc = bat_selfc_year / variables.generated_year;
					if(!forceSelfC) {
						$('#self-consumption-output').html(Math.round(100*ui_selfc)+'%');
					}
					else { //check which is the min selfC that generates the highest bat selfC
						if(ui_selfc > highestBatSelfC) {
							highestBatSelfC = ui_selfc;
							selfC = forceSelfC/100;
							highestSelfC = selfC;
						}
					}
				}

				return result;
			},
			calculateUsageValuesPerSeason: function(v) {
				v.usage = {};

				// calculate usage values for each season
				Object.keys(variables.charge).forEach(function(season){
					v.usage[season] = (( v.state_defaults.bill_factor[season] * v.annual_bill  ) - v.charge[season]) / (v.kWh_cost / 100);
				});
			},
			calculateMaxSelfC: function(v, highestSelfC = 0, highestBatSelfC = 0) {
				let usageFirstYear = Object.values(v.usage).reduce((a,b) => a+b, 0);
				let generated = v.generated_year;
				let maxSCR = (usageFirstYear/generated)*100;
				let maxAvgScr = Math.round(maxSCR);
				if(highestSelfC != 0) //battery calc
					maxAvgScr = Math.ceil(highestBatSelfC*100);
				return Math.min(100, maxAvgScr); //can't be greater than 100%
			},
		},

		/* UI */
		ui: {
			bars: function() {
				if (list_progress.length) {
					list_progress.find('[data-val][data-of]').each(function () {
						$(this).append('<div class="bar"><div style="width: ' + parseFloat($(this).attr('data-val')) / parseFloat($(this).attr('data-of')) * 100 + '%">' + accounting.formatMoney(parseFloat($(this).attr('data-val')), '$ ', 0) + '</div></div>');
					});
				}
			},
			accordions: function () {
				let accordion_a = $(document.getElementsByClassName('accordion-a'));
				if (accordion_a.length) {
					accordion_a.semanticAccordion();
				}
			},
			moduleCtas: function () {
				let module_cta = $(document.getElementsByClassName('module-cta'));
				if (module_cta.length) {
					module_cta.each(function(){
						$(this).find('figure').clone().appendTo($(this).find(':header span:last-child'));
					});
				}
			},
			initSliders: function () {
				var ui_slider_a = $('.ui-slider-a:not(:has(.ui-slider))');
				ui_slider_a.each(function () {
					$(this).addClass('slider-visible');
					if ($(this).is(':not([data-prefix])')) {
						$(this).attr('data-prefix', '');
					}
					if ($(this).is(':not([data-suffix])')) {
						$(this).attr('data-suffix', '');
					}
					$(this).find('input').filter('[type="date"]').addClass('is-date');
					$(this).find('input').attr('type', 'text').attr('readonly', true).each(function () {
						if ($(this).is(':not([data-step])')) {
							$(this).attr('data-step', 1);
						}
					});
	
					if ($(this).find('input.is-date').length) {
						this.months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
					}
	
					this.els = $(this).nextAll('[data-ui]');
	
					if (this.els.length) {
						this.conds = this.els.map(function (a, b) {
							return [[
								$(b).attr('data-ui')[0].replace('-', '<=').replace('+', '>='),
								$(b).attr('data-ui').replace(/[^\d]/, '')
							]];
						}).get();
						this.els.addClass('was-hidden');
					}
	
					$(this).append('<div class="slider"></div>').children('.slider').data({
						'els': this.els,
						'conds': this.conds,
						'months': this.months || []
					}).slider({
						range: 'min',
						min: parseFloat($(this).find('[min]').attr('min')),
						max: parseFloat($(this).find('[max]').attr('max')),
						step: parseFloat($(this).find('[data-step]').attr('data-step')),
						value: parseFloat($(this).find('input:first').val()),
						slide: function (event, ui) {
							this.co = $(this);
							this.months = ui.months || this.co.data('months');
							this.csa = this.co.closest('.ui-slider-a');
							if (this.months.length) {
								this.csa.find('input').val(this.months[ui.value - 1]);
								return true;
							}
							this.csa.find('input').val((this.csa.is('[data-prefix]') && this.csa.attr('data-prefix')) + ui.value + (this.csa.is('[data-suffix]') && this.csa.attr('data-suffix')));
							this.els = ui.c ? ui.els : this.co.data('els');
							this.conds = ui.c ? ui.conds : this.co.data('conds');
							this.els.addClass('hidden');
							this.i = 0;
							while (this.i < this.els.length) {
								if (new Function('return ' + ui.value + this.conds[this.i][0] + this.conds[this.i][1])()) {
									$(this.els[this.i]).removeClass('hidden');
								}
								this.i++;
							}
	
							$(event.target).trigger('change');
						}
					}).slider('option', 'slide').call($(this), {}, {
						value: parseFloat($(this).find('input')[0].attributes.value.value),
						c: 1,
						els: this.els,
						conds: this.conds,
						months: this.months || []
					});
	
					$(this).find('.ui-slider-handle').append('<span class="label">Slide to change</span>');
					$(this).find('.ui-slider').prev('span:not(.label)').appendTo($(this));
				});
			},
		}
	}
});


