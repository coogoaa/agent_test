https://www.solarquotes.com.au/js/calc/result_debug.js?1750159026

```js```
var generationDailyMax = 0;
var highestSelfC =0, highestBatSelfC =0;
var inverterReplacementCost = 0, inverterReplacementInflation = 0;
var plans = [], initPlansQueued = false;
var i = 0,
img_lazy = document.querySelectorAll('img[data-src]:not(.dont)');
for (i = 0; i < img_lazy.length; i = i + 1) {
	img_lazy[i].classList.add('lazy');
}

var energyPlan;
var seasons = ['summer', 'autumn', 'winter', 'spring'];

document.addEventListener('DOMContentLoaded', function () {
	
	google.charts.load('current', {packages: ['corechart', 'bar']});
	google.charts.setOnLoadCallback(function(){
		init();
	});

	'use strict';
	yall({
		observeChanges: true,
		threshold: 500
	});
});

var windowResizeTimeout;
function init(){
	var interval = setInterval(function(){
		if(typeof rCalcs.refreshCalc != 'undefined' && typeof sCalc !== 'undefined'){
			// set initial values
			sCalc.solarCalc.calculateUsageValuesPerSeason(variables);

			for(i=-1; i<=100; i++)
				rCalcs.utils.calculateYearlyValues(0, {forceSelfC: i});
			rCalcs.refreshCalc();
			rCalcs.init();
			graphs.generationYearly();
			graphs.generationDaily(new Date().getMonth() + 1);
			clearInterval(interval);

		}
		}, 100
	);

	//this makes the daily generation chart responsive
	window.addEventListener('resize', function(){
		clearTimeout(windowResizeTimeout);
		windowResizeTimeout = setTimeout(function(){
			graphs.generationDaily(new Date().getMonth() + 1);
			graphs.generationYearly();
			graphs.cumulativeYearly();
		}, 1000);
	});
}

var rCalcs = {};
var graphs = {};
// We'll use this object to cache calculations
var values = {
	years: {
		savings: []
	},
	maxSelfC: {
		summer: 1, autumn: 1, winter: 1, spring: 1
	}
};
jQuery(function () {
	"use strict";
	var $ = jQuery.noConflict();
	rCalcs = {
		init: function(){
			sCalc.initShareLink({ solarCalc: true });
			sCalc.initEmailBtn();
			sCalc.initBtnEdit();

			this.refreshOnStop();
			this.binds();

			let v = variables;
			let maxAvgScr = sCalc.solarCalc.calculateMaxSelfC(v, highestSelfC, highestBatSelfC);
			jQuery('#self-consumption-slider .slider').slider({max: maxAvgScr});
			let currentValue = Math.round(maxAvgScr/2);
			let editCode = $('#share-btn').data('code');
			editCode = JSON.parse(atob(decodeURIComponent(editCode)));
			if(editCode['customSelfConsumption'] !== undefined)
				currentValue = editCode['customSelfConsumption'];

			setTimeout(function(){
				if(has_battery)
					jQuery('#self-consumption').val('('+currentValue+'% without batteries)');
				else
					jQuery('#self-consumption').val(currentValue+'%');
				jQuery('#self-consumption-slider').data('value', currentValue);
				jQuery('#self-consumption-slider .slider').slider('value', currentValue);
				if(editCode['customInflation'] !== undefined) {
					jQuery('#inflation').val(editCode['customInflation']+'%');
					jQuery('#inflation-slider').data('value', editCode['customInflation']);
					jQuery('#inflation-slider .slider').slider('value', editCode['customInflation']);
				}
				rCalcs.refreshCalc();
				rCalcs.refreshOnStop();
			}, 100);
		},
		binds: function() {
			jQuery('#self-consumption-slider .slider').slider({
				stop: function(event, ui){
					$('#self-consumption-slider').data('value', ui.value);
					if(has_battery)
						$('#self-consumption').val('(' + ui.value + '% without batteries)');
					else
						$('#self-consumption').val(ui.value+"%");					
					rCalcs.refreshOnStop();
					//rCalcs.debugOnStop();
				},
				slide: function(event, ui){
					$('#self-consumption-slider').data('value', ui.value);
					if(has_battery)
						$('#self-consumption').val('(' + ui.value + '% without batteries)');
					else
						$('#self-consumption').val(ui.value+"%");
					rCalcs.refreshCalc();
				}
			})
			jQuery('#inflation-slider .slider').slider({
				stop: function(event, ui){
					rCalcs.refreshOnStop();
					//rCalcs.debugOnStop();
				},
				slide: function(event, ui){
					$('#inflation-slider').data('value', ui.value);
					$('#inflation').val(ui.value + '%');
					rCalcs.refreshCalc();
				},
			});
			jQuery('#daily-generation-slider .slider').slider({
				slide: function(ui, obj){
					var months = {
						1: 'January',2:'February',
						3: 'March',4:'April',
						5: 'May',6: 'June',
						7: 'July',8: 'August',
						9: 'September',10: 'October',
						11: 'November',12: 'December'
					};
					var current_month = obj.value;
					var month_caption = months[current_month];
					jQuery('#dailygen').val(month_caption);
					graphs.generationDaily(current_month);
				}
			});
		},
		refreshOnStop: function(){
			graphs.cumulativeYearly();
			graphs.generationYearly();
		},
		debugOnStop: function() {
			//debug
			var cumulativesavings = [];
			var infl = parseInt($('#inflation').val());
			for(i=0; i<10; i++) {
				cumulativesavings['Year_'+(i+1)] = {
					savings: values.years[i].savings.year,
					direct_savings: values.years[i].savings.year - values.years[i].savings.year_exported,
					export_savings: values.years[i].savings.year_exported,
				};
			}
			console.group("Yearly savings - "+ infl + "% inflation");
			console.log("savings = direct_savings + export_savings")
			console.log(cumulativesavings);
			console.groupEnd();
		},
		refreshValues: function(){
			values.years = [];
			for(var i=0;i<30;i++){
				values.years.push(this.utils.calculateYearlyValues(i));
			}

			var selfC = $('#self-consumption-slider').data('value') / 100;
			if(isNaN(selfC))
				selfC = variables.selfC / 100;
			if(has_battery)
				$('#exported').text(100 - parseInt($('#self-consumption-output').html()));	
			else
				$('#exported').text(Math.round(100 - selfC * 100));	
			$.each(['summer', 'autumn', 'winter', 'spring'], function(i, season){
				if(!values.maxSelfC[season])
					values.maxSelfC[season] = 1;
				$('#selfc-'+season).text(Math.min(Math.round(variables.state_defaults.self_consumption_ratio[season] * (selfC*100 / variables.selfC)), 100, Math.round(values.maxSelfC[season]*100)));
			});
			if(selfC==1)
				$('#selfc-summer:not(.reached-limit), #selfc-autumn, #selfc-winter, #selfc-spring').text(100);
			if($('#self-consumption-slider').data('value') != 100 && $('#self-consumption-slider').data('value') == $('#self-consumption-slider .slider').slider('option', 'max')) {
				$('#max-selfc-info').show();
				$('#max-selfc-info').html($('#self-consumption-slider').data('value')+"% average self consumption is the maximum possible with your usage.<br><a href='#' class='btn-edit-inputs'>Go&nbsp;back</a> and increase your bill to increase max self consumption.");
				$('#seasonal-selfc-info').hide();
			}
			else {
				$('#max-selfc-info').hide();
				$('#seasonal-selfc-info').show();
			}

			var unitPrice = inverterReplacementCost - inverterReplacementInflation;
			$('#inverterReplacementCost').html(`Includes an inverter replacement at the 12 year mark. ` 
				+ `Replacement cost is \$${Math.round(inverterReplacementCost).toLocaleString('au-AU')} ` 
				+ `(\$${Math.round(unitPrice).toLocaleString('au-AU')} for the unit and \$${Math.round(inverterReplacementInflation).toLocaleString('au-AU')} accounting for ${jQuery('#inflation').val()} inflation)`);
		},
		refreshCalc: function(){
			rCalcs.refreshValues();
			var result = values.years[0];
			sCalc.refreshModuleResults(result, { has_battery: has_battery });

			let label = energyPlan === undefined || energyPlan.name == 'Select tariff' ? 'Default = ' : '';
			$('#energy_plan_details').html(`${label}Usage: ${variables.kWh_cost.toFixed(2)}c &nbsp Feed-In: ${variables.FiT.toFixed(2)}c &nbsp Daily Charge: ${variables.dailyCharge.toFixed(2)}c`);

			$('.fy-savings').text(Math.round(result.savings.year).toLocaleString('au-AU'));
			$('#after-solar-savings').text(Math.round(result.savings.year_after_solar).toLocaleString('au-AU'));
			if(has_battery) {
				$('#after-solar-savings-batteries-only').text(Math.round(result.savings.year - result.savings.year_after_solar).toLocaleString('au-AU'));
				$('.fy-solar-savings').html(Math.round(result.savings.year_after_solar).toLocaleString('au-AU'));
				$('.fy-bat-savings').html(Math.round(result.savings.year - result.savings.year_after_solar).toLocaleString('au-AU'));
			}

			var years = values.years;
			var total_savings = 0;
			var payback = 0;

			for(var i = 1; i <= values.years.length; i++){
				total_savings += years[i-1].savings.year;
				if(total_savings > total_cost && payback == 0){
					payback = i;
					var detPaybackSystem = sCalc.detailedPayback(i-1, total_savings - years[i-1].savings.year, values.years[i-1].savings.year);
					$('#detailed-payback').text(detPaybackSystem.string);
					var paybackTxt = detPaybackSystem.months >= 6 ? (detPaybackSystem.years+1):detPaybackSystem.years;
					$('#payback').text(paybackTxt);
					$('#payback').next().text(parseInt(paybackTxt) == 1 ? 'year' : 'years');
					break;
				}
			}
			if(has_battery) {
				var batteryonly_cost = (pData.battery_cost.replace(",",""));
				var savings_batteryonly = 0;
				var payback_batteryonly = 0;

				var infl = parseInt(jQuery('#inflation').val()) / 100;
				var batt_savings_year0 = values.years[0].savings.year - values.years[0].savings.year_after_solar;

				for(var j = 0; j <= 10000; j++){
					if(j>=values.years.length)
						values.years.push(this.utils.calculateYearlyValues(j));
					savings_batteryonly += batt_savings_year0 * Math.pow((1+infl), j);
					if(savings_batteryonly >= batteryonly_cost){
						++j;
						if(j>2) {
							$('#payback-batteries-only, #detailed-payback-bat').text(j +" yrs");
						} else {
							var detPaybackBat = sCalc.detailedPayback(j-1, savings_batteryonly - years[j-1].savings.year - years[j-1].savings.year_after_solar, years[j-1].savings.year + values.years[j-1].savings.year_after_solar, batteryonly_cost);
							$('#payback-batteries-only, #detailed-payback-bat').text(detPaybackBat.string);
						}
						break;
					}
				}

				var solaronly_cost = total_cost - parseFloat(pData.battery_cost.replace(",",""));
				var savings_solaronly = 0;
				var payback_solaronly = 0;
				for(var i = 1; i <= values.years.length; i++){
					savings_solaronly += years[i-1].savings.year_after_solar;
					if(savings_solaronly > solaronly_cost && payback_solaronly == 0){
						payback_solaronly = i;
						var detPaybackSolar = sCalc.detailedPayback(i-1, savings_solaronly - years[i-1].savings.year_after_solar, values.years[i-1].savings.year_after_solar, solaronly_cost);
						$('#payback-solar-only, #detailed-payback-solar').text(detPaybackSolar.string);
						break;
					}
				}						
			}

			var ten_year_savings = 0;
			for(var i=1; i<=10; i++)
				ten_year_savings += years[i-1].savings.year;
			
			var twenty_year_savings = ten_year_savings;
			for(var i=11; i<=20; i++)
				twenty_year_savings += years[i-1].savings.year;

			$('.ten-year-savings').text(ten_year_savings.toLocaleString('au-AU'));
			$('.twenty-year-savings').text(twenty_year_savings.toLocaleString('au-AU'));
			$('#inverter_size').text(Math.ceil(parseFloat(total_capacity) / variables.dc_ac_ratio));

			return;
		},
		utils:{
			// Calculates Yearly Values - Year 0 is the First Year
			calculateYearlyValues: function(year, options = {}){
				let currentSelfC =  $('#self-consumption-slider').data('value');
				options.currentSelfC = currentSelfC;
				options.infl = parseInt($('#inflation').val()) / 100;
				options.energyPlan = options.energyPlan ?? energyPlan; // if an energy plan wasn't specified, use the selected one
				options.has_battery = has_battery;
				return sCalc.solarCalc.calculateYearlyValues(values, year, options);
			},
			monthsNumberToString : function(monthsNumber) {
				let months = monthsNumber%12;
				let years = (monthsNumber - months)/12;
				let string = "";
				if(years>0 && months>0)
					return years + (years>1?" yrs, ":" yr, ") + months + " mth" + (months>1?"s":"");
				if(years>0)
					return years + (years>1?" yrs":" yr");
				return months + " mth" + (months>1?"s":"");
			}
		},
	};
	graphs = {
		generationYearly: function(){
			var data = new google.visualization.DataTable();
			data.addColumn('string', 'Month');
			data.addColumn('number', 'kWh');

			data.addRows(generation_data);

			var options = {
				height: '240',
				//height: '100%',
				// width: '423',
				width: '100%',
				hAxis: {
					format: "#,###k",
					slantedText: 'false'
				},
				vAxis: {
					title: 'kWh',
					minValue: 0,
				},
				explorer: {
					axis: 'horizontal',
					//keepInBounds: true,
					actions: ['dragToPan']
				},
				legend: {position: 'none'},
				chartArea: {'left': '47', 'width': '100%', 'height': '80%'},
				colors: ['#293a8e'],
			};

			jQuery('#chart-generation').html("");

			var chart = new google.visualization.ColumnChart(
				document.getElementById('chart-generation'));

			chart.draw(data, options);
		},
		cumulativeYearly: function(){
			var data = new google.visualization.DataTable();
			data.addColumn('number', 'Year');
			data.addColumn('number', 'Feed In Tariff');
			data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
			data.addColumn('number', 'Self Consumption');
			data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
			data.addColumn('number', 'Solar System Cost');
			data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});

			var exported_agg = 0;
			var sc_agg = 0;
			rCalcs.refreshValues();
			for(var i=0;i<10;i++){
				var year_info = values.years[i];
				exported_agg += year_info.savings.year_exported;
				sc_agg += year_info.savings.year - year_info.savings.year_exported;

				data.addRow([
					i+1, 
					exported_agg, 
					"<div><strong>Year "+(i+1)+"</strong><br>Feed In Tariff: <strong>$&nbsp;"+exported_agg.toLocaleString('au-AU')+"</strong></div>", 
					sc_agg, 
					"<div><strong>Year "+(i+1)+"</strong><br>Self Consumption: <strong>$&nbsp;"+sc_agg.toLocaleString('au-AU')+"</strong></div>", 
					total_cost,
					"<div>Solar System Cost: <strong>$&nbsp;"+total_cost.toLocaleString('au-AU')+"</strong></div>", 
				]);
			}

			var options = {
				height: '295',
				//height: '100%',
				// width: '455',
				width: '100%',
				//legend: {position: 'none'},
				legend: { position: 'top', alignment: 'start', textStyle: {fontSize: 9}},
				colors: ['#12a6dc', '#293a8e', '#fb2e4e'],
				vAxis: {
					format: "short",
				},
				hAxis: {
					ticks: [
						{v:2, f: '2'}, {v: 4, f: '4'}, {v: 6, f:'6'}, {v: 8, f: '8'}, {v:10, f:'10'}
					]
				},
				chartArea: {'width': '80%', 'height': '80%'},
				isStacked: true,
				seriesType: 'bars',
				series: {2: {type: 'line'}},
				explorer: {
					axis: 'horizontal',
					keepInBounds: true,
					actions: ['dragToPan']
				},
				tooltip: {isHtml: true}
			};

			jQuery('#chart-cumulative').html("");

			var chart = new google.visualization.ComboChart(
				document.getElementById('chart-cumulative'));

			google.visualization.events.addListener(chart, 'ready', function () {
			    var axisLabels = document.getElementById('chart-cumulative').getElementsByTagName('text');
			    for (var i = 0; i < axisLabels.length; i++) {
			      if (axisLabels[i].getAttribute('text-anchor') === 'end') {
			        axisLabels[i].innerHTML = '$' + axisLabels[i].innerHTML;
			      }
			    }
			});			

			chart.draw(data, options);
		},
		generationDaily: function(month){
			var data = new google.visualization.DataTable();
			data.addColumn('number', 'Time of Day');
			data.addColumn('number', 'Power');
			data.addColumn({'type': 'string', 'role': 'tooltip', 'p': {'html': true}});
			var max = 0;
			var daily = production_info.monthly[month - 1].daily;
			if(generationDailyMax == 0) {
				for(var m=0; m<12; m++) {
					var hourlyThisMonth = production_info.monthly[m].hourly_average;
					for(var i=0;i<=hourlyThisMonth.length; i++){
						if(max < hourlyThisMonth[i])
							max = hourlyThisMonth[i];
					}
				}
				generationDailyMax = max;
			}
			var hourly = production_info.monthly[month - 1].hourly_average;

			for(var i=0;i<=hourly.length; i++){
				const timeString12hr = new Date('1970-01-01T' + ( i < 10 ? ('0'+i) : i ) + ':00Z')
				.toLocaleTimeString({},{timeZone:'UTC',hour12:true,hour:'numeric',minute:'numeric'})
				.replace(/^0:00 pm|^00:00 pm/gi,'12:00 pm'); // Replace is there to fix Chrome thinking midday is 0:00 pm
				data.addRow([i, hourly[i], '<div style="padding: 5px 10px;min-width: 100px;font-size: 11px;text-align: center;"><strong>'+timeString12hr+'</strong><br /><strong>kWh:</strong> '+(Math.round((hourly[i]/1000)*100)/100)+'</div>']);
			}			

			$('#dailygen-label').text(daily + ' kWh per day');

			max = generationDailyMax;

			var options = {
				height: '295',
				//height: '100%',
				//width: '455',
				width: '100%',
				legend: {position: 'none'},
				tooltip: {isHtml: true},
				colors: ['#12a6dc', '#293a8e', '#fb2e4e'],
				vAxis: {
					format: "short",
					ticks: [ max ],
					maxValue: ( Math.ceil(max / 1000) + 1 ) * 1000
				},
				hAxis: {
					ticks: [
						{v: 5, f: 'sunrise'}, {v: 12, f: 'midday'}, {v: 17, f: 'sunset'}
					]
				},
				chartArea: {'width': '65%', 'height': '80%'}
			};

			var chart = new google.visualization.AreaChart(
				document.getElementById('chart-daily'));
			google.visualization.events.addListener(chart, 'ready', function () {
			    var axisLabels = document.getElementById('chart-daily').getElementsByTagName('text');
			    for (var i = 0; i < axisLabels.length; i++) {
			      if (axisLabels[i].getAttribute('text-anchor') === 'end') {
			        axisLabels[i].innerHTML = axisLabels[i].innerHTML.toLowerCase() + 'W';
			      }
			    }
			});	
			chart.draw(data, options);
		}
	}
});





```js```