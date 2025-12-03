https://www.solarquotes.com.au/battery-storage/calculator/

```html```


<!doctype html>
<html lang="en" dir="ltr">
<head>
		<meta charset="utf-8">
		<meta http-equiv="x-ua-compatible" content="ie=edge">
		<title>Battery Calculator: See Your Savings And Payback</title>
		<meta name="description" content="Calculate your savings with our Battery Calculator for existing solar panel systems. Discover the payback period of adding a solar battery in Australia. Easy to use.">
		<meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
		<link rel="canonical" href="https://www.solarquotes.com.au/battery-storage/calculator/" />
		<meta name="theme-color" content="#ffffff">
		<meta name="MobileOptimized" content="320">
		<meta name="HandheldFriendly" content="true">
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, target-densitydpi=device-dpi, shrink-to-fit=no">
		<link rel="stylesheet" href="/css/calc/screen.css?1761222346"/>		
		<link rel="mask-icon" href="/img/safari-pinned-tab.svg" color="#238F44">
		<link rel="manifest" href="/site.webmanifest">
		<link rel="icon" href="https://www.solarquotes.com.au/wp-content/themes/focus/images/favicon.ico">
		<link rel="preconnect" href="https://ajax.googleapis.com">
		<meta name="msapplication-config" content="browserconfig.xml">
		<meta property="og:title" content="Battery Calculator: See Your Savings And Payback">
		<meta property="og:type" content="article">
		<meta property="og:description" content="Calculate your savings with our Battery Calculator for existing solar panel systems. Discover the payback period of adding a solar battery in Australia. Easy to use.">
		<meta property="og:site_name" content="SolarQuotes">
		<meta property="og:url" content="https://www.solarquotes.com.au/battery-storage/calculator/">
		<meta property="og:image" content="https://www.solarquotes.com.au/img/calc/calc-og.jpg">
		<meta property="og:image:secure_url" content="https://www.solarquotes.com.au/img/calc/calc-og.jpg" />
		<script>
			var is_device = false;			let getEnergyPlansUrl = "/battery-storage/calculator/getEnergyPlans" + '/';
			let randomToken = "f29176868a18c78bd5d32c3f28b7dbfcdf895cf4";

			let energyPlans = [];
			let selectedDiscounts = null;

			let selectedPlan = null;
			let ratesStructure = [];
		</script>
		
<style>
	.plan-info { }
		.plan-info p { margin-bottom: 0px; }
		.plan-info p span { font-weight: 500; }
		.plan-info h1 { margin-bottom: 8px; margin-top: 0px; font-size: 20px;  }
		.popup-calc h1 { font-size: 20px !important; }
		.plan-info h2 { margin-bottom: 30px; margin-top: 5px; font-size: 15px; font-weight: normal; }
		.plan-info h3 { margin-bottom: 5px; margin-top: 0px; font-size: 15px; }
			.plan-info h3.period-header { margin-bottom: 5px; font-size: 16px; font-weight: 500; margin-bottom: 15px; }
		.plan-info .plan-block { padding: 10px 10px 10px 15px; background: var(--white); border-radius: 5px; margin-bottom: 20px; border: 1px solid var(--mishka); }
		.plan-info > div > div.plan-block { padding-top: 15px; padding-bottom: 15px; }
			.plan-info > div > div.plan-block > div >  div.plan-block { padding-top: 20px; padding-bottom: 20px; }
		.plan-info .plan-block .plan-block:last-child { margin-bottom: 0px; }
		.plan-info label + .plan-block { margin-top: 10px; margin-bottom: 10px !important; }
		[data-title="energy-plan"] .box-inset { padding: 30px; }
		[data-title="energy-plan"] .link-btn { flex-direction: row; justify-content: space-evenly; width: 100%; margin: 40px 0 0 0; }
			[data-title="energy-plan"] .link-btn a { width: 47%;}
				[data-title="energy-plan"] .link-btn a.close { background-color: var(--coral); }
		
		.plan-info .energy-editable-value { display: flex; align-items:center; justify-content: end; }
			.plan-info .energy-editable-value value { font-weight: normal;}
			.plan-info .energy-editable-value span { font-weight: normal; }
		.plan-info .energy-editable-value button { width: 40px; padding: 0px 5px; height: 25px; margin: 2px 0 0 10px; font-weight: normal; font-size: 14px; background-color: rgba(0,0,0,0); width: 70px; color: var(--rhino); border-color: var(--rhino); }
		.plan-info .energy-editable-value input { width: 100px; flex-shrink: 1; height: 30px; }

		.popup-calc .plan-info .input-label input { width: 75px; }
		.popup-calc .plan-info .input-label span:nth-child(2) { width: 80px;}
		.popup-calc .plan-info .double > *:nth-child(1) { width: 120px; }

		.plan-info .tags-collection { margin-bottom: 10px; margin-top: 10px; }
		.plan-info .tags-collection .tag {
			text-transform: none;
			font-weight: 500;
			margin-right: 10px;
		}
		.plan-info .tags-collection .tag > span { font-weight: normal; padding: 0 5px; }

		.plan-info .plan-block .block-description { display: flex; margin-bottom: 7px; }
		.plan-info .plan-block .block-description > span { margin-left: 4px; line-height: 1.5; }
		.plan-info .plan-block > div:not(:first-child) .block-description { margin-top: 20px; }



		@media only screen and (max-width: 47.5em) {
			
		}
</style>

<script type="module">

	// Downloaded from https://unpkg.com/htm@3.1.1/preact/standalone.mjs
	// If prefers signals: https://npm.reversehttp.com/@preact/signals-core,@preact/signals,htm/preact,preact
	import {render, html, useReducer, useState } from '/js/preact/preact.js'
	import { Tags } from '/js/preact/components/tags/tags.js';

	const blockPeriodMapping = {
		'Y': 'Year',
		'M': 'Month',
		'D': 'Day',
		'3M': 'Quarter',
	};

	export function EnergyPlanPopup({ ratesStructure, energyPlan, onChangesUpdated, hideTotalDiscounts, startingChanges={}, editable=true, onConfirm }) {
		const usageCharge = energyPlan.usageCharge;
		const type = {
			singleTariff: 'Single Rate',
			timeOfUse: 'Time Of Use',
		}[usageCharge.type] ?? '';

		const [controlledLoad, setClRates] = useState(ratesStructure.controlledLoadRates);
		const [FiT, setFiT] = useState(ratesStructure.FiT);
		const [dailySupplyCharge, setDailySupplyCharge] = useState(ratesStructure.dailySupplyChargeGST);
		const [demandCharge, setDemandCharge] = useState(ratesStructure.demandChargeGST || ratesStructure.dailyChargeStructureGST?.[0]?.demandCharge || null);
		const [stRates, setStRates] = useState(ratesStructure.rates);
		const [touRates, setTouRates] = useState(energyPlan.usageCharge.data);
		const feeDetails = energyPlan.feeDetails.split('</br>').map((item) => item.trim()).filter((item) => item.isNotEmpty);

		const [changes, setChanges] = useState(startingChanges);
		
		const handleSupplyChargeChange = (v) => { 
			setDailySupplyCharge(v); 
			changes['supplyCharge'] = v;
			onChangesUpdated(changes);
		};
		const handleDemandChargeChange = (v) => {
			setDemandCharge(v);
			changes['demandCharge'] = v;
			onChangesUpdated(changes);
		};
		const handleSingleFiTChange = (v) => { 
			setFiT(v);
			changes['FiT'] = v;
			onChangesUpdated(changes);
		};
		const handleFiTChange = (v) => { 
			setFiT([...v]); 
			changes['FiT'] = v.map((item) => { 
				return {  rate: item.rate };
			})
			onChangesUpdated(changes);
		}

		const handleSTRatesChange = (v) => { 
			setStRates([...v]); 
			changes['stRates'] = v.map((item) => { 
				return {  blockRates: item.blockRates };
			})
			onChangesUpdated(changes);
		}
		const handleTouRatesChange = (v) => { 
			setTouRates([...v]);
			changes['tou'] = v.map((item) => { 
				return {
					dailySupplyCharge: item.dailySupplyCharge,
					touBlock: item.touBlock.map((touItem) => {
						return {
							blockRate: touItem.blockRate
						};
					}) 
				};
			});
			onChangesUpdated(changes);
		}
		const handleClRatesChange = (v) => { 
			setClRates([...v]); 
			changes['cl'] = v.map((item) => { 
				return {  blockRates: item.blockRates };
			})
			onChangesUpdated(changes);
		}

		console.log('energyPlan', energyPlan)

		return html`
			<div class="plan-info">
				<h1>${energyPlan.name}</h1>
				<h2>${type} Plan</h2>
				<a class="close icon-add"></a>
				${Divider()}
				<label>Usage Charge</label>
				<br/>
				${ratesStructure.rateType === 'SingleTariff' && html`
					<${PeriodBlockRates} rates=${stRates} handleRatesChange=${handleSTRatesChange} editable=${editable} />
				`}
				${ratesStructure.rateType === 'TimeOfUse' && html`<${TouRates} editable=${editable} data=${energyPlan.usageCharge.data} handleRatesChange=${handleTouRatesChange} />`}

				${controlledLoad !== null && controlledLoad.length > 0 && html`
					<label>Controlled Load</label>
					<${PeriodBlockRates} rates=${controlledLoad} handleRatesChange=${handleClRatesChange} editable=${editable} />
				`}

				${Array.isArray(FiT) && FiT.length > 0 && html`
					<${FiTRates} editable=${editable} FiT=${FiT} handleRatesChange=${handleFiTChange} />
					${Divider()}
				`}
				${dailySupplyCharge !== null && html`
					<div class="double">
						<span>Supply Charge</span>
						<${EditableValue} editable=${editable} value=${dailySupplyCharge} append="c/day" convertToCents="true" onChange=${handleSupplyChargeChange} />
					</div>
						${demandCharge !== null && html`
							<div class="double">
								<span>Demand Charge</span>
								<${EditableValue} editable=${editable} value=${demandCharge} append="c/kW/day" convertToCents="true" onChange=${handleDemandChargeChange} />
							</div>
						`}
					${Divider()}
				`}
				${!Array.isArray(FiT) && html`
					<div class="double">
						<span>Feed in Tariff (FiT)</span>
						<${EditableValue} editable=${editable} value=${FiT} append="c/kWh" convertToCents="false" onChange=${handleSingleFiTChange} />
					</div>
					<span style="display: block; margin-top: 15px;">* We don't take any government FiT into consideration</span>
					${Divider()}
				`}
				${hideTotalDiscounts == true ? '' : html `<p><span>Total Discount Applied</span>: <value>${(ratesStructure.discountPercentage*100).toFixed(2) }% </value></p><br/>`}
				${feeDetails.length != 0 && html`
					<label>Fee details <span>(not considered in the calculations)</span></label>
					<br/>
					<div class="plan-block"><p>${feeDetails.map(fee => html`<p>${fee}</p>`)}</p></div>
				`}
				${energyPlan.planEligibility !== null && html`
					<div class="plan-block"> 
						<p><span>Plan Eligibility: </span> <value>${energyPlan.planEligibility}</value></p> 
					</div>
				`}
				<${AvailableDiscounts} energyPlan=${energyPlan} />
				<button class="confirm-button" onclick=${onConfirm} > ${editable ? 'Confirm' : 'Close'} </button>
				${energyPlan.offerId != 'custom' && !['VIC', 'WA', 'NT'].includes(energyPlan.state) && html`
					<br/>
					<div class="action-buttons center">
						<a target="_blank" href="https://www.energymadeeasy.gov.au/plan?id=${energyPlan.offerId}&postcode=${energyPlan.postcode}"> See more </a>
					</div>
				`}
			</div>
		`;
	}

	const EditableValue = ({ value, append, convertToCents, onChange, editable }) => {
		convertToCents = convertToCents == 'true';
		const [inputValue, setInputValue] = useReducer((_, newValue) => newValue, convertToCents ? cents(value) : value);
		
		const handleSave = (e) => {
			console.log(e);
			let fv = parseFloat(e.target.value);
			onChange(convertToCents ? (fv / 100) : fv);
		};

		let v = convertToCents ? cents(value) : value;

		return html`
			<div class="energy-editable-value">

				<div class="input-label">
					<input disabled=${!editable} type="number" onchange="${handleSave}" value=${convertToCents ? cents(value) : value}/>
					<span> ${append} </span>
				</div>

			</div>
		`;
	};

	const FiTRates = ({ FiT, handleRatesChange, editable }) => {
		
		return html`
			<div>
				<p><span>Feed in Tariff (FiT)</span></p>
				${'volume' in FiT[0] ? (
					BlockRates({ editable: editable, blockRates: FiT, blockPeriod: 'Day',  ratesChanged: handleRatesChange, gst: 0, alreadyInCents: true, usedText: 'exported' })
				) : (
					html`<div class="plan-block">
						${FiT.map((fit, index) => {
							
							const handleFiTChange = (v) => {
								fit.rate = v;
								FiT[index] = fit;
								handleRatesChange(FiT);
							}

							const startTime = convertTouToReadableTime(parseInt(fit.startTime, 10));
							const endTime = convertTouToReadableTime(parseInt(fit.endTime, 10));
							return html`<p><span>${startTime} - ${endTime}</span><${EditableValue} editable=${editable} value=${fit.rate} append="c/kWh" convertToCents="false" onChange=${handleFiTChange} /></p>`;
						})}
					</div>`
				)}
				<span>* We don't take any government FiT into consideration</span>
				</div>
		`;
	};

	const AvailableDiscounts = ({ energyPlan }) => {
		const { availablePercentageDiscounts, availableAmountDiscounts } = energyPlan;
		const discountsCount = availablePercentageDiscounts.length + availableAmountDiscounts.length;

		let body = html`
			${availablePercentageDiscounts.map(discount => html`
				<div class="plan-block">
					<p><span>${discount.name}: ${discount.value}%</span></p>
					<p>${discount.description}</p>
				</div>
			`)}
			${availableAmountDiscounts.map(discount => html`
				<div class="plan-block">
					<p><span>${discount.name}: $${discount.value}</span></p>
					<p>${discount.description}</p>
				</div>
			`)}
		`;

		return html`
			<div>
				${discountsCount > 0 && html`<h3><span>Available Discounts</span></h3>`}
				${discountsCount > 1 ? PlanBlock({ body }) : body}
			</div>
		`;
	};

	const PlanBlock = ({ body }) => {
		return html`<div class="plan-block">${body}</div>`;
	};

	const TouRates = ({ data, handleRatesChange, editable }) => {
		return html`
			${data.map((period, index) => {
				const options = { month: 'short', day: 'numeric' };
				const startDate = new Date(period.startDate).toLocaleDateString('en-US', options);
				const endDate = new Date(period.endDate).toLocaleDateString('en-US', options);
				const supplyCharge = (period.dailySupplyCharge * 1.1).toFixed(2);
				const demandCharge = (period.demandCharge * 1.1).toFixed(2);

				const handleSupplyChargeChange = (v) => {
					v = parseFloat((v / 1.1).toFixed(3))
					period.dailySupplyCharge = v;
					data[index] = period;
					handleRatesChange(data);
				}

				const handleDemandChargeChange = (v) => {
					v = parseFloat((v / 1.1).toFixed(3))
					period.demandCharge = v;
					data[index] = period;
					handleRatesChange(data);
				}

				return html`
					<div>
						${data.length > 1 && html`<h3 class="period-header">From ${startDate} to ${endDate}</h3>`}
						<div class="plan-block">
							${period.touBlock.map((block, indexBlock) => {


								// Change unitPrice to rate, so we can reuse the BlockRate component
								let blockRates = block.blockRate.map((rate) => {
									return {
										rate: rate.unitPrice / 100,
										volume: rate.volume,
									}
								});

								const handleBlockRateChange = (v) => {
									// We now have to convert the rate back to unitPrice, this mess is due to not using the ratesStructure object for building this popup, which would have these values standardized. However, as the ratesStructure is broken down in small time pieces for tou plans, using them here would not be a good idea, so it's better to keep converting back and forth between the two formats.
									v = v.map((item) => {
										return {
											unitPrice: (item.rate * 100).toFixed(3),
											volume: item.volume,
										}
									});
									block.blockRate = v;
									period.touBlock[indexBlock] = block;
									data[index] = period;
									handleRatesChange(data);
								}

								// Custom plans set it on a touBlock level and original plans set it on a period level
								var blockPeriod = block.blockPeriod ?? period.blockPeriod;
								blockPeriod = blockPeriod ? (blockPeriodMapping[blockPeriod.replace('P1', '').replace('P', '')] || '') : null;

								let timeOfUse = block.timeOfUse ?? [];
								let timeOfUseGrouped = {};

								for (let i = 0; i < timeOfUse.length; i++) {
									const time = timeOfUse[i];
									const days = time.days.split('|').join(', ');
									timeOfUseGrouped[days] ??= [];
									timeOfUseGrouped[days].push(time);
								}

								return html`
									<div>
										<div class="block-description">
											<label>${block.name}:</label>
											<span>${block.description} </span>
										</div>
										<div class="plan-block">
											${Object.keys(timeOfUseGrouped).map((days) => {
												let times = timeOfUseGrouped[days];

												return html`
													<div>
														<h3>${days}</h3>
														<${Tags} tags=${times.map((time) => {
															const startTime = convertTouToReadableTime(parseInt(time.startTime, 10));
															const endTime = convertTouToReadableTime(parseInt(time.endTime, 10));

															return html`${startTime} <span>-</span> ${endTime}`;
														})} />
													</div>
												`;
											})}
											<${BlockRates} blockRates=${blockRates} blockPeriod=${blockPeriod} ratesChanged=${handleBlockRateChange} editable=${editable} />
										</div>
									</div>
								`;
							})}
							<br/>
							<div class="double">
								<span>Daily Supply Charge</span> 
								<${EditableValue} editable=${editable} value=${supplyCharge} append="c/day" convertToCents="false" onChange=${handleSupplyChargeChange} />
							</div>
							${demandCharge !== null && html`
								<div class="double">
									<span>Demand Charge</span> 
									<${EditableValue} editable=${editable} value=${demandCharge} append="c/kW/day" convertToCents="false" onChange=${handleDemandChargeChange} />
								</div>
							`}
						</div>
					</div>
				`;
			})}
		`;
	};


	const BlockRates = ({ blockRates, blockPeriod, gst = 0.1, alreadyInCents = false, usedText = 'used', ratesChanged = () => {}, editable }) => {
		let lastVolume = 0;

		return html`<div class="plan-block">
			${blockRates.map((block, index) => {
				const rate = cents(block.rate * (1 + gst), alreadyInCents);
				const volume = block.volume + lastVolume;
				const volumeStr = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(volume);
				const lastVolumeStr = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lastVolume);

				const handleRateChange = (v) => { 
					if(!alreadyInCents) v = v / 100;
					v = v / (1+gst);
					block.rate = v;
					blockRates[index] = block;
					ratesChanged(blockRates);
				};

				let previous = "";
				let thisVolume = "";
				if (lastVolume > 0) {
					previous = `From ${lastVolumeStr} kWh / ${blockPeriod} ${usedText}`;
					if (volume > lastVolume) {
					thisVolume = ` to ${volumeStr} kWh / ${blockPeriod}: `;
					} else {
					previous = `Above ${lastVolumeStr} kWh / ${blockPeriod} ${usedText}: `;
					}
				} else if (blockRates.length > 1) {
					thisVolume = `First ${volumeStr} kWh / ${blockPeriod}: `;
				}

				var spanContent = `${previous}${thisVolume}`
				if (spanContent.length == 0) spanContent = "Rate: ";

				const htmlContent = html`
					<div class="double">
						<span>${spanContent}</span>
						<${EditableValue} editable=${editable} value=${rate} append="c/kWh" convertToCents="false" onChange=${handleRateChange} />
					</div>
				`;
				lastVolume = volume;
				return html`<p>${htmlContent}</p>`;
			})}
		</div>`;
	};

	const PeriodBlockRates = ({ rates, handleRatesChange = () => {}, editable}) => {
		return html`<div class=${rates.length > 1 ? 'plan-block' : ''}>
			${rates.map((rate, index) => {
				const blockPeriod = blockPeriodMapping[rate.blockPeriod] || '';
				let startDateFormatted = '';
				let endDateFormatted = '';

				if (rates.length > 1) {
					const options = { month: 'short', day: 'numeric' };
					startDateFormatted = new Date(rate.startDate).toLocaleDateString('en-US', options);
					endDateFormatted = new Date(rate.endDate).toLocaleDateString('en-US', options);
				}

				const handlePeriodRatesChange = (newRates) => {
					rate.blockRates = newRates;
					rates[index] = rate;
					handleRatesChange(rates);
				}

				return html`
					<div key=${index}>
					${rates.length > 1 && html`<h3>From ${startDateFormatted} to ${endDateFormatted}</h3>`}
					<${BlockRates} blockRates=${rate.blockRates} blockPeriod=${blockPeriod} ratesChanged=${handlePeriodRatesChange} editable=${editable} />
					</div>
					${Divider()}
				`;
			})}
		</div>`;
	};

	function Divider(transparent = false) {
		return html`<div style="${transparent ? 'background: none;' : ''}" class="divider"></div>`;
	}

	const cents = (dol, alreadyInCents = false) => {
		// Convert to cents if not already, then format to a string with two decimal places
		const amount = dol * (alreadyInCents ? 1 : 100);
		return amount.toFixed(2);
	};

	const convertTouToReadableTime = (time) => {
		// Handle edge case: if minute is 59, roll it to the next hour
		if (time % 100 === 59) {
			time += 41;
		}

		let hour = Math.floor(time / 100);
		let minute = time % 100;

		// Wrap hour to 0 if it's 24 (midnight)
		if (hour === 24) hour = 0;

		let ampm = (hour >= 12) ? "pm" : "am";

		// Convert 24h to 12h format
		if (hour > 12) hour -= 12;
		if (hour === 0) hour = 12;

		minute = minute.toString().padStart(2, '0');

		return `${hour}:${minute}${ampm}`;
	};


	window.renderEnergyPlanPopup = ({container, ratesStructure, energyPlan, onChangesUpdated, hideTotalDiscounts = false, startingChanges = {}, editable=true, onConfirm}) => {
		let key = (new Date()).getTime();
		render(html`<${EnergyPlanPopup} key=${key} onConfirm=${onConfirm} onChangesUpdated=${onChangesUpdated} ratesStructure=${ratesStructure} energyPlan=${energyPlan} startingChanges=${startingChanges} hideTotalDiscounts=${hideTotalDiscounts} editable=${editable} />`, container);
	}
</script>		<script type="module">

	// Downloaded from https://npm.reversehttp.com/@preact/signals-core,@preact/signals,htm/preact,preact
	import { render, html, useSignal, signal, effect, Component } from '/js/preact/preact_signals.js'
	import { SQToggleButton } from '/js/preact/components/toggle_button/toggle_button.js';
	import { SQSwitch } from '/js/preact/components/switch/switch.js';

	const BUSINESS_DAYS = 'Business Days';
	const SUNDAY = 'Sunday';
	const MONDAY = 'Monday';
	const TUESDAY = 'Tuesday';
	const WEDNESDAY = 'Wednesday';
	const THURSDAY = 'Thursday';
	const FRIDAY = 'Friday';
	const SATURDAY = 'Saturday';

	const THE_BUSINESS_DAYS = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY];

	const DAY_ORDER = {
		Sunday: 1,
		Monday: 2,
		Tuesday: 3,
		Wednesday: 4,
		Thursday: 5,
		Friday: 6,
		Saturday: 7,
		Others: 8,
	};

	const OTHERS = 'Others';

	const TIME_OF_USE = 'Time of Use';
	const SINGLE_RATE = 'Single Rate';

	var selectedPlanListener = false;

	const looksLikeDollars = (value, threshold = 1) => {
		const numeric = parseFloat(value);
		return !Number.isNaN(numeric) && numeric > 0 && numeric < threshold;
	};

	export function CreateEnergyPlanPopup({ ajaxSearchDefaultPlan, onPlanSaved, initialEnergyPlan, initialRatesStructure }) {

		const defaultPeriodsStructure = [
			{
				name: 'Summer',
				startDate: '',
				endDate: '',
				dailySupplyCharge: '',
				demandCharge: null
			},
			{
				name: 'Winter',
				startDate: '',
				endDate: '',
				dailySupplyCharge: '',
				demandCharge: null
			}
		];

		const fitMode = useSignal('Fixed Rate'); // Possible values: 'Fixed Rate', 'Time Periods', 'Volume Tiers'
		const solarFit = useSignal([]);

		const selectedPlan = useSignal(SINGLE_RATE);
		const controlledLoad = useSignal(false);
		const totalDiscount = useSignal('0');
		const selectedRetailer = useSignal(null);
		const useDifferentRates = useSignal(false);
		const useControlledLoad = useSignal(false);
		const periods = useSignal(JSON.parse(JSON.stringify(defaultPeriodsStructure)));
		const currentPeriod = useSignal(0);
		
		const loadingDefaultPlan = useSignal(false);
		const foundDefaultPlan = useSignal(false);

		const invalidFields = useSignal(false);
		const invalidPeriods = useSignal([]);
		const hasDollarRate = useSignal(false);

		const showDemandCharge = useSignal(false);

		const usageChargeInitialStructure = {
			blockPeriod: 'D',
			blockRates: [{ rate: null, volume: null }],
		};
		const initiated = useSignal(false);

		// Store initial data as a deep copy to avoid mutating props
    const initialPlanData = useSignal(initialEnergyPlan ? JSON.parse(JSON.stringify(initialEnergyPlan)) : null);
    const initialRatesData = useSignal(initialRatesStructure ? JSON.parse(JSON.stringify(initialRatesStructure)) : null);

		// Reset function
    const resetForm = () => {
        // If initial data exists, reload it
        if (initialPlanData.value && initialRatesData.value) {
					selectedRetailer.value = initialPlanData.value.providerName;
					$('#retailer-selection')[0].value = selectedRetailer.value;
					if (initialEnergyPlan.pricingModel == 'TOU') {
						selectedPlan.value = TIME_OF_USE;
						if (initialEnergyPlan.usageCharge.data.length > 1) {
							useDifferentRates.value = true;
						}
					} else {
						selectedPlan.value = SINGLE_RATE;
						if (initialEnergyPlan.usageCharge.periods.length > 1) {
							useDifferentRates.value = true;
						}
					}
					loadedDefaultPlan({
						energyPlan: initialPlanData.value,
						ratesStructure: initialRatesData.value
					});
					hasDollarRate.value = false;
        } else {
					fitMode.value = 'Fixed Rate';
					solarFit.value = [];
					selectedPlan.value = SINGLE_RATE;
					controlledLoad.value = false;
					totalDiscount.value = '0';
					selectedRetailer.value = null;
					useDifferentRates.value = false;
					useControlledLoad.value = false;
					periods.value = JSON.parse(JSON.stringify(defaultPeriodsStructure));
					currentPeriod.value = 0;
					loadingDefaultPlan.value = false;
					foundDefaultPlan.value = false;
					invalidFields.value = false;
					invalidPeriods.value = [];
					hasDollarRate.value = false;
					showDemandCharge.value = false;
					differentDailyRatesStatus.value = false;
				}
    };
		
		const touInitialStructure = [
				{
					name: 'Peak',
					... JSON.parse(JSON.stringify(usageChargeInitialStructure)),
					timeOfUse: [
						{ days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 0, endTime: 59, },
						{ days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 600, endTime: 959, },
						{ days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 1500, endTime: 2359, },
					],
				},
				{
					name: 'Off-Peak',
					... JSON.parse(JSON.stringify(usageChargeInitialStructure)),
					timeOfUse: [
						{ days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ],startTime: 100, endTime: 559, },
					],
				},
				{
					name: 'Shoulder',
					... JSON.parse(JSON.stringify(usageChargeInitialStructure)),
					timeOfUse: [
						{ days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 1000, endTime: 1459, },
					],
				},
			];
		
		const differentDailyRatesStatus = useSignal(false);
		const differentDailyRatesInitialStructure = [
			{
				name: null,
				... JSON.parse(JSON.stringify(usageChargeInitialStructure)),
				timeOfUse: [
					{ days: [ OTHERS ], startTime: 0, endTime: 2359, },
				],
			},
		];

		// When Retailer, plan type or multiple rates change, call the server to get a default plan
		// This plan is likely to match the structure of the plan the user is trying to create
		const updateDefaultPlan = () => {
			loadingDefaultPlan.value = true;
			ajaxSearchDefaultPlan({
				retailer: selectedRetailer.value,
				planType: selectedPlan.value,
				multipleTariffPeriods: useDifferentRates.value,
				controlledLoad: useControlledLoad.value,
			})
			.then(response => response.json())
			.then((data) => {
				loadedDefaultPlan(data);
			});
		}

		// Get the default plan that's just been fetched and apply it to the structure being used on this widget
		const loadedDefaultPlan = (data) => {
			loadingDefaultPlan.value = false;
			if(data.energyPlan == null) {
				periods.value = JSON.parse(JSON.stringify(defaultPeriodsStructure));
				if(!useDifferentRates.value) {
					periods.value[0].startDate = '01/01';
					periods.value[0].endDate = '31/12';
				}
				foundDefaultPlan.value = false;
				hasDollarRate.value = false;
				for(const period of periods.value) {
					showDemandCharge.value = false;
					period.demandCharge = null;
				}
				return;
			}

			foundDefaultPlan.value = true;
			
			let energyPlan = data.energyPlan;
			let ratesStructure = data.ratesStructure;

			totalDiscount.value = (ratesStructure.discountPercentage*100).toString();

			// For single rate plans, use the rates from the usage charge, it's more convenient because of the structure normalized on RatesStructure class
			let defaultPeriods = selectedPlan.value == SINGLE_RATE ? ratesStructure.rates : energyPlan.usageCharge.data;

			for(const period of defaultPeriods) {
				period.startDate = formatDateInDDMM(period.startDate ?? '01/01');
				period.endDate = formatDateInDDMM(period.endDate ?? '31/12');
				period.name ??= 'Period';

				if(selectedPlan.value == SINGLE_RATE) {
					if (!period.blockRates && !period.blockPeriod) {
						period.blockRates = period.data.blockRates;
						let blockRates = period.blockRates;
						for(const block of blockRates) {
							block.rate = parseFloat(((block.rate / 1.1) / 100));
						}
						period.blockPeriod = period.data.blockPeriod;
					} 

					// Apply GST and convert block rates to cents
					let blockRates = period.blockRates;
					for(const block of blockRates) {
						block.rate = parseFloat(((block.rate * 1.1) * 100).toFixed(2));
					}

					period.data = {
						blockPeriod: period.blockPeriod ?? 'D',
						blockRates: blockRates,
					};

					period.dailySupplyCharge = parseFloat((ratesStructure.dailySupplyChargeGST * 100).toFixed(2));
					if (ratesStructure.demandChargeGST) {
						showDemandCharge.value = true;
						period.demandCharge = parseFloat((ratesStructure.demandChargeGST * 100).toFixed(2));
					}

					delete period.blockRates;
					delete period.blockPeriod;
				}else{
					// Gets the touBlock from the loaded plan.
					let touBlock = rebuildTOUStructure(period.touBlock);

					// If the weekday rates got returned by the API, set the differentDailyRatesStatus
					let weekdayRates = energyPlan.usageCharge.weekdayRates ?? false;
					// Checks if the weekday rates got returned by the API.
					if (weekdayRates) {
						differentDailyRatesStatus.value = weekdayRates.differentDailyRatesStatus;
					}

					for(const block of touBlock) {
						block.blockRates = block.blockRate ?? [];
						block.timeOfUse = block.timeOfUse ?? [];
						// If this is a original plan, blockPeriod is on a period level, 
						// if it's a custom plan being edited, it's on a block level, as the tool sets it per tou block
						let blockPeriod = period.blockPeriod ?? block.blockPeriod;
						delete block.blockRate;

						// Apply GST
						for(const blockRate of block.blockRates) {
							blockRate.rate = parseFloat((blockRate.unitPrice * 1.1).toFixed(2));
							delete blockRate.unitPrice;
						}

						block.blockPeriod =  (blockPeriod ?? 'D').replace('P1', '').replace('P3', 'P');
						for(const tou of block.timeOfUse) {
							const separators = ['|', '&'];
							for(const sep of separators) {
								// If day is an array with only one element, convert it to a string
								if (Array.isArray(tou.days) && tou.days.length == 1 && tou.days[0].includes(sep)) {
									tou.days = tou.days[0];
								}
								// If day is a string and contains a separator, convert it to an array
								if(tou.days.includes(sep)) {
									tou.days = tou.days.split(sep).map((day) => day.trim());
								}
							}
							if(!Array.isArray(tou.days)) tou.days = [tou.days];

							tou.days.sort();
							tou.days = tou.days.map((i) => toTitleCase(i));
							tou.startTime = parseInt(tou.startTime);
							tou.endTime = parseInt(tou.endTime);
						}
					}
					period.data = breakdownTouStructure(touBlock);
					period.dailySupplyCharge = parseFloat((period.isFormReset ? period.dailySupplyCharge : period.dailySupplyCharge * 1.1).toFixed(2));
					if (period.demandCharge) {
						showDemandCharge.value = true;
						const demandCharge = period.demandCharge;
						if (Array.isArray(demandCharge)) {
							const validRates = demandCharge.map(dc => parseFloat(dc.rate)).filter(rate => !isNaN(rate));
							if (validRates.length > 0) {
								const total = validRates.reduce((sum, rate) => sum + rate, 0);
								const value = (total / validRates.length).toFixed(2);
								period.demandCharge = (period.isFormReset ? value : value * 1.1).toFixed(2);
							}
						} else {
							period.demandCharge = parseFloat((period.isFormReset ? period.demandCharge : period.demandCharge * 1.1).toFixed(2));
						}
					} else {
						showDemandCharge.value = false;
						period.demandCharge = null;
						handlePeriodChange(defaultPeriods);
					}
					period.isFormReset = true; // flag to indicate that the form has been reset
				}
				period.planType = selectedPlan.value;
			}
			
			if(useDifferentRates.value) {
				periods.value = defaultPeriods;
			}else{
				periods.value[0] = defaultPeriods[0];
			}

			// Handle FIT data and determine the mode
			if (Array.isArray(ratesStructure.FiT)) {
				let fit = ratesStructure.FiT;
				fit.sort((a, b) => a.startTime - b.startTime);
				fit = fit.filter((fit) => fit.type != 'G');

				for (let i = 0; i < fit.length; i++) {
					fit[i].startTime = fit[i].startTime == null ? null : formatTime(fit[i].startTime);
					fit[i].endTime = fit[i].endTime == null ? null : formatTime(fit[i].endTime);
				}

				// Determine if this is Time Periods or Volume Tiers
				if (fit.length > 0 && fit[0].startTime != null) {
					fitMode.value = 'Time Periods';
					solarFit.value = fit;
				} else if (fit.length > 1) {
					fitMode.value = 'Volume Tiers';
					solarFit.value = fit.map((f, index) => ({
						rate: f.rate,
						volume: index < fit.length - 1 ? f.volume : null,
					}));
				} else {
					fitMode.value = 'Fixed Rate';
					solarFit.value = fit[0]?.rate;
				}
			} else {
				fitMode.value = 'Fixed Rate';
				solarFit.value = ratesStructure.FiT;
			}

			handlePeriodChange(periods.value);
		}

		const updatePlan = (event) => {
			if(currentPeriod.value > 0 && event.target.value == SINGLE_RATE ) currentPeriod.value = 0;
			if(type == SINGLE_RATE) differentDailyRatesStatus.value = false;
      		selectedPlan.value = event.target.value;
			updateDefaultPlan();
		};

		const selectedPlanTypeChanged = (type) => {
			if(currentPeriod.value > 0 && type == SINGLE_RATE ) currentPeriod.value = 0;
			if(type == SINGLE_RATE) differentDailyRatesStatus.value = false;
			selectedPlan.value = type;
			updateDefaultPlan();
		}

		const retailerChanged = (event) => {
			currentPeriod.value = 0;
			selectedRetailer.value = event.target.value;
			updateDefaultPlan();
			localStorage.setItem('retailer-create-plan', event.target.value);

			$(event.target).parent('.sqDropdown').removeClass('opened');

			if (differentDailyRatesStatus.value) {
				$('.weekdays-rate.has-child-component .switch.on').trigger('click');
			}
		}

		const handleDifferentRatesChange = (event) => {
			useDifferentRates.value = !useDifferentRates.value;
			if(!useDifferentRates.value) {
				currentPeriod.value = 0;
			}

			updateDefaultPlan();
		}

		const handleDifferentRatesWeekdaysChange = (newStatus) => {
			differentDailyRatesStatus.value = newStatus;
			updateDefaultPlan();
		}

		const simplifyTOUStructure = (inputData) => {
			let simplifiedData = inputData.map(originalData => {
				if (originalData.timeOfUse === undefined) {
					return;
				}
				const simplified = {
						type: 'simplified',
						name: originalData.name,
						blockPeriod: originalData.blockPeriod,
						description: originalData.description,
						timeOfUse: {}
					};

					// Save the rate.
					if (originalData.blockRate) {
						simplified.blockRate = originalData.blockRate;
					}
					// Fix for rates.
					if (originalData.blockRates) {
						simplified.blockRates = originalData.blockRates;
					}

					originalData.timeOfUse.forEach(item => {
					// If day is a string, convert it to an array
					if (typeof item.days === 'string') {
						item.days = [item.days];
					}
					item.days.forEach(day => {
						if (!simplified.timeOfUse[day]) {
							simplified.timeOfUse[day] = [];
						}
						const intervalString = `st:${item.startTime};et:${item.endTime}`;
						if (!simplified.timeOfUse[day].includes(intervalString)) {
							simplified.timeOfUse[day].push(intervalString);
						}
					});
				});
				for (const day in simplified.timeOfUse) {
					simplified.timeOfUse[day] = simplified.timeOfUse[day].join('|');
				}
				return simplified;
			});
			// Remove empty sets.
			simplifiedData = simplifiedData.filter(data => data !== undefined);
			return JSON.parse(JSON.stringify(simplifiedData));
		}

		const rebuildTOUStructure = (simplifiedData) => {
			return simplifiedData.map(simplified => {
				// If it's not a simplified structure, return it as is (keep working for the old ones)
				if (simplified.type !== 'simplified') {
					return JSON.parse(JSON.stringify(simplified));
				}
				const fullStructure = {
					name: simplified.name,
					blockPeriod: simplified.blockPeriod,
					description: simplified.description,
					timeOfUse: []
				};

				// Retrieve the rate.
				if (simplified.blockRate) {
					fullStructure.blockRate = simplified.blockRate;
				}
				// Fix for rates.
				if (simplified.blockRates) {
					fullStructure.blockRates = simplified.blockRates;
				}

				for (const [day, intervals] of Object.entries(simplified.timeOfUse)) {
					intervals.split('|').forEach(interval => {
							const [startTime, endTime] = interval.split(';').map(val => val.split(':')[1]).map(Number);
							fullStructure.timeOfUse.push({
							days: [day],
							startTime: startTime,
							endTime: endTime
						});
					});
				}
				return JSON.parse(JSON.stringify(fullStructure));
			});
		}

		const handleControlledLoadChange = (event) => {
			useControlledLoad.value = !useControlledLoad.value;

			updateDefaultPlan();
		}

		const updateDollarRateStatus = () => {
			let foundDollarRate = false;

			const checkBlockRates = (blockRates) => {
				if (foundDollarRate || !Array.isArray(blockRates)) {
					return;
				}
				for (const blockRate of blockRates) {
					if (looksLikeDollars(blockRate && blockRate.rate)) {
						foundDollarRate = true;
						break;
					}
				}
			};

			for (const period of periods.value) {
				if (foundDollarRate || !period || !period.data) {
					continue;
				}
				const data = period.data;
				if (Array.isArray(data.blockRates)) {
					checkBlockRates(data.blockRates);
				}
				if (Array.isArray(data.touBlock)) {
					data.touBlock.forEach((block) => checkBlockRates(block && block.blockRates));
				}

				if (!foundDollarRate && looksLikeDollars(period.dailySupplyCharge, 2)) {
					foundDollarRate = true;
				}
				if (!foundDollarRate && looksLikeDollars(period.demandCharge, 2)) {
					foundDollarRate = true;
				}
			}

			hasDollarRate.value = foundDollarRate;
		};

		const handlePeriodChange = (v) => {
			periods.value = [...v];
			updateDollarRateStatus();
		}

		// Function to switch FIT mode
		const switchFitMode = (newMode) => {
			if (fitMode.value === newMode) return;
			// Reset solarFit when switching modes to avoid data conflicts
			if (newMode === 'Fixed Rate') {
				solarFit.value = null ;
			} else if (newMode === 'Time Periods') {
				solarFit.value = [{ startTime: '00:00', endTime: '23:59', rate: null }];
			} else if (newMode === 'Volume Tiers') {
				solarFit.value = [{ rate: null, volume: null }, { rate: null }];
			}

			fitMode.value = newMode;
		};

		// Function to handle fixed FIT rate change
		const handleFixedFitChange = (event) => {
			solarFit.value = parseFloat(event.target.value) || 0;
		};

		const handleTotalDiscountChange = (event) => {
			totalDiscount.value = event.target.value;
		}

		const incrementFitTP = () => {
			if(!Array.isArray(solarFit.value)) solarFit.value = [{ startTime: '', endTime: '', rate: solarFit.value }];
			solarFit.value.push({ startTime: '', endTime: '', rate: null });

			if(solarFit.value.length > 1) {
				solarFit.value[solarFit.value.length - 2].endTime = '';
				solarFit.value[solarFit.value.length - 1].endTime = solarFit.value[0].startTime;
			}

			solarFit.value = [...solarFit.value];
		}

		const decrementFitTP = () => {
			solarFit.value.pop();

			if(solarFit.value.length == 1) {
				solarFit.value = solarFit.value[0].rate;
			}

			if(solarFit.value.length > 1) {
				solarFit.value[solarFit.value.length - 1].startTime = solarFit.value[solarFit.value.length - 2].endTime;
				solarFit.value[solarFit.value.length - 1].endTime = solarFit.value[0].startTime;
			}

			solarFit.value = Array.isArray(solarFit.value) ? [...solarFit.value] : solarFit.value;
		}

		// Functions for Volume Tiers mode
		const incrementFitTier = () => {
			if (!Array.isArray(solarFit.value)) return;
			solarFit.value.splice(solarFit.value.length - 1, 0, { rate: null, volume: null });
			solarFit.value = [...solarFit.value];
		};

		const decrementFitTier = () => {
			if (!Array.isArray(solarFit.value) || solarFit.value.length <= 1) return;
			solarFit.value.pop();
			if (solarFit.value.length === 1) {
				solarFit.value[0] = { rate: solarFit.value[0].rate }; // Convert to single tier
			}
			solarFit.value = [...solarFit.value];
		};

		const saveEnergyPlan = () => {
			if (hasDollarRate.value) {
				return;
			}

			var tariffType = selectedPlan.value == TIME_OF_USE ? 'TOU' : 'SR';
			if(controlledLoad.value) tariffType += 'CL';
			
			var fit;
			if (fitMode.value === 'Fixed Rate') {
				const fitRate = parseFloat(solarFit.value);
				if (isNaN(fitRate) || fitRate < 0) {
					return;
				}
				fit = [{
					rate: parseFloat(solarFit.value),
					type: 'R',
					description: 'Retailer Feed-in Tariff',
				}];
			} else if (fitMode.value === 'Time Periods') {
				fit = solarFit.value.map((fit) => {
					var endTime = 0;
					if (parseTime(fit.endTime) == 0) {
						endTime = 2359;
					} else {
						const modEndTime = parseTime(fit.endTime) % 100;
						endTime = (modEndTime == 29 || modEndTime == 59) ? parseTime(fit.endTime) : parseTime(fit.endTime) - 1;
					}
					if (endTime % 100 >= 60) endTime -= 40;
					return {
						startTime: parseTime(fit.startTime),
						endTime: endTime,
						rate: parseFloat(fit.rate),
					};
				});
			} else if (fitMode.value === 'Volume Tiers') {
				fit = solarFit.value.map((fit, index) => ({
					rate: parseFloat(fit.rate),
					volume: index < solarFit.value.length - 1 ? parseFloat(fit.volume) : null,
				}));
			}

			let cl = {};
			let tariffPeriod = [];

			const parseDateToSave = (date, nextYear=false) => {
				let parts = date.split('/');
				let currentYear = new Date().getFullYear() + (nextYear ? 1 : 0);
				return `${currentYear}-${parts[1]}-${parts[0]}`;
			}
			
			let periodCount = useDifferentRates.value ? periods.value.length : 1;
			for(var i = 0; i < periodCount; i++) {
				let period = periods.value[i];
				let data = period.data;

				let tariff = {
					name: period.name, 
					startDate: parseDateToSave(period.startDate),
					endDate: parseDateToSave(period.endDate, period.startDate > period.endDate),
					dailySupplyCharge: period.dailySupplyCharge/1.1, 
					demandCharge: period.demandCharge ? period.demandCharge / 1.1 : null,
				};

				if(selectedPlan.value == TIME_OF_USE) {
					let brokenDownBlocks = data.brokenDownBlocks;
					let timeOfUse = {};

					for(var day of Object.keys(brokenDownBlocks)) {
						let blocks = brokenDownBlocks[day];
						day = day.replace(/ & /g, '|');

						for(const block of blocks) {
							let startTime = parseTime(block.startTime);
							var endTime = 0;
							if (parseTime(block.endTime) == 0) {
								endTime = 2359;
							} else {
								const modEndTime = parseTime(block.endTime) % 100;
								console.log(block.endTime);
								endTime = modEndTime == 29 || modEndTime == 59 ? parseTime(block.endTime) : parseTime(block.endTime) - 1;
							}
							if(endTime % 100 >= 60) endTime -= 40;
							let name = block.name;
							timeOfUse[name] ??= [];
							
							let timeOfUseItem = {
								days: day,
								startTime: startTime.toString(),
								endTime: endTime.toString(),
							}
							timeOfUse[name].push(timeOfUseItem);
						}
					}
					
					let touBlock = data.touBlock.map((block) => {
						let rates = block.blockRates.map((rate) => {
							return { volume: rate.volume ? parseFloat(rate.volume) : null, unitPrice: parseFloat(rate.rate)/1.1 };
						});
						let blockCopy = JSON.parse(JSON.stringify(block));
						blockCopy.blockRate = rates;
						blockCopy.blockPeriod = blockCopy.blockPeriod == '3M' ? `P${blockCopy.blockPeriod}` : `P1${blockCopy.blockPeriod}`;
						delete blockCopy.blockRates;
						blockCopy.timeOfUse = timeOfUse[block.name];
						blockCopy.description = '';
						return blockCopy;
					});
					
					tariff.touBlock = simplifyTOUStructure(touBlock);
				}else if(selectedPlan.value == SINGLE_RATE) {

					let rates = data.blockRates;
					rates = rates.map((rate) => {
						return { volume: rate.volume ? parseFloat(rate.volume) : null, unitPrice: parseFloat(rate.rate)/1.1 };
					});
					
					tariff.blockPeriod = data.blockPeriod == '3M' ? `P${data.blockPeriod}` : `P1${data.blockPeriod}`;
					tariff.blockRate = rates;
				}

				tariffPeriod.push(tariff);
			}

			let discountList = [];
			if(totalDiscount.value != '0') {
				discountList.push({
					name: `${totalDiscount.value}% Guaranteed Discount`,
					type: 'U',
					description: `${totalDiscount.value}% off electricity usage and supply charges.`,
					discountPercent: parseFloat(totalDiscount.value),
				});
			}

			// Creates the structure for the weekday rates.
			let weekdayRates = {
				differentDailyRatesStatus: false,
			};

			if (selectedPlan.value == TIME_OF_USE && differentDailyRatesStatus.value) {
				weekdayRates.differentDailyRatesStatus = differentDailyRatesStatus.value;
			}

			let contract = {
				pricingModel: selectedPlan.value == TIME_OF_USE ? 'TOU' : 'SR',
				solarFit: fit,
				controlledLoad: cl,
				tariffPeriod: tariffPeriod,
				discount: discountList,
				weekdayRates: weekdayRates,
			};

			let data = {
				planId: 'CUSTOM',
				planName: 'Custom',
				customerType: 'R',
				retailerName: selectedRetailer.value,
				tariffType: tariffType,
				contract: [contract],
			};

			let energyPlan = {
				planId: 'CUSTOM',
				planData: data,
			};
			onPlanSaved(energyPlan);
		}

		effect(() => {
			if(selectedPlanListener) return;
			setTimeout(() => {
				selectedPlanListener = true;
				document.querySelector('[name="retailer-selection-value"]').addEventListener('change', retailerChanged);
			}, 500);
		});


		if(initiated.value == false){
			initiated.value = true;
			// if not saved retrieve here 
			if(initialEnergyPlan != null && initialRatesStructure != null) {
				if(initialEnergyPlan.pricingModel == 'TOU') {
					selectedPlan.value = TIME_OF_USE;
					if(initialEnergyPlan.usageCharge.data.length > 1) {
						useDifferentRates.value = true;
					}
				}else{
					if(initialEnergyPlan.usageCharge.periods.length > 1) {
						useDifferentRates.value = true;
					}
				}
				selectedRetailer.value = initialEnergyPlan.providerName;
				loadedDefaultPlan({ energyPlan: initialEnergyPlan, ratesStructure: initialRatesStructure });
			}
		}
			
		// We wait a bit so the form builds and we can set as invalid if .missing-required was added to any input
		setTimeout(() => {
			updateDollarRateStatus();
			var invalid = document.querySelectorAll('.plan-create .missing-required').length > 0;
			
			let newInvalidPeriods = [];
			
			if(!invalid && useDifferentRates.value) {
				var requirePeriods = {};
				for(var index = 0; index < periods.value.length; index++) {
					let period = periods.value[index];
					var required = [ period.startDate, period.endDate, period.dailySupplyCharge, period.name ];

					let data = period.data;
					if(data == undefined) {
						required.push(data);
						requirePeriods[index] = required;
						break;
					}

					let brokenDownBlocks = data.brokenDownBlocks;

					// Remove the blocks that don't have a name set
					data.touBlock = data.touBlock.filter((block) => block.name != null);

					if(selectedPlan.value == TIME_OF_USE) {
						let touBlock = data.touBlock;
						if(touBlock == null) break;
						for(const tblock of touBlock) {
							required.push(tblock.name);
							for(var i = 0; i < tblock.blockRates.length; i++) {
								if(i != tblock.blockRates.length - 1) required.push(tblock.blockRates[i].volume);
								required.push(tblock.blockRates[i].rate);
							}
						}

						for(const key of Object.keys(brokenDownBlocks)) {
							let brokenDownBlockArray = brokenDownBlocks[key];
							let fieldsToAdd = brokenDownBlockArray.map((block) => { return [ block.startTime, block.endTime, block.name ]; }).flat();
							required = [ ...required, ...fieldsToAdd ];
						}
					}else if(selectedPlan.value == SINGLE_RATE) {
						required.push(period.data.blockPeriod);
						if(period.data.blockRates == null) break;
						for(var i = 0; i < period.data.blockRates.length; i++) {
							let block = period.data.blockRates[i];
							if(i != period.data.blockRates.length - 1) required.push(block.volume);
							required.push(block.rate);
						}
					}
					
					requirePeriods[index] = required;
				}
				for(const periodIndex of Object.keys(requirePeriods)) {
					let required = requirePeriods[periodIndex];
					const numericPeriodIndex = parseInt(periodIndex, 10);
					let invalidPeriod = required.some((i) => (i ?? '').toString().trim() == '');
					invalid = invalid || invalidPeriod;

					if(invalidPeriod && !newInvalidPeriods.includes(numericPeriodIndex)) {
						newInvalidPeriods.push(numericPeriodIndex);
					}
				}
			}

			invalidFields.value = invalid;

			newInvalidPeriods.sort();

			// override invalidPeriods.value only if they are different, because we don't want to trigger infinite renders
			let invalidPeriodsBeforeStr = invalidPeriods.value.reduce((acc, val) => acc + val, '');
			let newInvalidPeriodsStr = newInvalidPeriods.reduce((acc, val) => acc + val, '');
			if(invalidPeriodsBeforeStr != newInvalidPeriodsStr) {
				invalidPeriods.value = newInvalidPeriods;
			}
		}, 100);

		// Expose resetForm via a ref-like mechanism
    CreateEnergyPlanPopup.resetForm = resetForm;

		return html`
			<link rel="stylesheet" href="/css/calc/dialogs/create_energy_plan.css?v137"/>
			<div class="plan-create">
				<h1>Add your Energy Plan</h1>
				<a class="close icon-add"></a>
				${Divider()}
				<div class="double">
					<label>Retailer</label>
					<div class="sqDropdown retailer-selection options-radio ">
    <input type="text" name="retailer-selection" placeholder="" required="required" id="retailer-selection" class="sqDropdownText" autocomplete="off" value=""/>    
    <input type="hidden" name="retailer-selection-value" class="hiddenDropdownValue" value=""/>    <div class="options">
        <div class="icon-search"> 
        <input type="text" name="retailer-selection_search" placeholder="Search your retailer" value=""/>    </div>
        <ul>
                            </ul>
    </div>
</div>

				</div>
				${selectedRetailer.value && html `
					${Divider()}
					<div class="double until-390">
						<label>Plan Type</label>
						<div class="plan-type">
							<${SQToggleButton} checked=${selectedPlan.value} onChange="${selectedPlanTypeChanged}" options=${[SINGLE_RATE, TIME_OF_USE]} />
						</div>
					</div>

					<${SQSwitch} label="My plan has different rates per season" checked=${useDifferentRates.value} onChange=${handleDifferentRatesChange} />

					${selectedPlan.value == TIME_OF_USE && html`
						<${SQSwitch} label="My plan has different daily rates" checked=${differentDailyRatesStatus.value} onChange=${handleDifferentRatesWeekdaysChange} classes="weekdays-rate has-child-component" />
					`}

					${Divider()}
					
					<div class="selected-plan-info popup-calc">
						${!loadingDefaultPlan.value && FlexiblePeriod({
							planType: selectedPlan.value, 
							periods: periods.value,
							handlePeriodChange: handlePeriodChange, 
							multiplePeriods: useDifferentRates.value,
							currentPeriod: currentPeriod,
							invalidPeriods: invalidPeriods.value,
							differentDailyRatesStatus: differentDailyRatesStatus.value,
						})}
						${loadingDefaultPlan.value && html`
							<div class="loading"> Loading... </div>
						`}
						${Divider()}

						<div class="double until-390">
							<label> Solar Feed-in Tariff </label>
						</div>
						<br/>

						<div class="fit-tabs">
							<button
								class=${`fit-tab ${fitMode.value === 'Fixed Rate' ? 'active' : ''}`}
								onclick=${() => switchFitMode('Fixed Rate')}
							>
								Fixed Rate
							</button>
							<button
								class=${`fit-tab ${fitMode.value === 'Time Periods' ? 'active' : ''}`}
								onclick=${() => switchFitMode('Time Periods')}
							>
								Time Periods
							</button>
							<button
								class=${`fit-tab ${fitMode.value === 'Volume Tiers' ? 'active' : ''}`}
								onclick=${() => switchFitMode('Volume Tiers')}
							>
								Volume Tiers
							</button>
						</div>

						<div class="fit-content">
							${fitMode.value === 'Fixed Rate' && html`
								<div class="double">
									<span> Rate </span>
									<div class="input-label">
										${FormInput({ type: 'number', placeholder: 'FiT', value: solarFit.value, onchange: handleFixedFitChange })}
										<span> c/kWh </span>
									</div>
								</div>
							`}

							${fitMode.value === 'Time Periods' && Array.isArray(solarFit.value) && html`
								<div class="action-buttons">
									<button class="button-add" onclick=${incrementFitTP}><div class="icon-add"></div>Add new time period</button>
								</div>
								<br/>
								${solarFit.value.map((fit, index) => {
									const handleTouFiTChange = (event) => {
										solarFit.value[index].rate = parseFloat(event.target.value);
										solarFit.value = [...solarFit.value];
									};

									const changeStartTime = (val) => {
										solarFit.value[index].startTime = val;
										if (index == 0) {
											solarFit.value[solarFit.value.length - 1].endTime = val;
										}
										solarFit.value = [...solarFit.value];
									};

									const changeEndTime = (val) => {
										solarFit.value[index].endTime = val;
										if (index != solarFit.value.length - 1) {
											solarFit.value[index + 1].startTime = val;
										}
										solarFit.value = [...solarFit.value];
									};

									const startDateDisabled = index > 0;
									const endDateDisabled = index == solarFit.value.length - 1;

									return html`
										<div class="flex-fit">
											<div class="broken-down-block">
												${SingleTimePeriod({
													startTime: fit.startTime,
													endTime: fit.endTime,
													handleStartChanged: changeStartTime,
													handleEndChanged: changeEndTime,
													startDateDisabled: startDateDisabled,
													endDateDisabled: endDateDisabled,
													placeholder: 'hh:mm',
												})}
											</div>
											<span> - </span>
											<div class="double">
												<div class="input-label">
													${FormInput({ value: fit.rate, onchange: handleTouFiTChange, type: 'number', placeholder: 'Solar FiT' })}
													<span> c/kWh </span>
												</div>
												${index > 1 && html`<div onclick=${() => decrementFitTP(index)} class="icon-trash"></div>`}
											</div>
										</div>
									`;
								})}
							`}

							${fitMode.value === 'Volume Tiers' && Array.isArray(solarFit.value) && html`
								<div class="action-buttons">
									<button class="button-add" onclick=${incrementFitTier}><div class="icon-add"></div>Add new tier</button>
								</div>
								<br/>
								${solarFit.value.map((fit, index) => {
									const handleTierRateChange = (event) => {
										solarFit.value[index].rate = parseFloat(event.target.value);
										solarFit.value = [...solarFit.value];
									};

									const handleTierVolumeChange = (event) => {
										solarFit.value[index].volume = parseFloat(event.target.value);
										solarFit.value = [...solarFit.value];
									};

									const includeVolume = index < solarFit.value.length - 1;
									const spanText = index === 0
										? solarFit.value.length > 1
											? 'c/kWh for the first'
											: 'c/kWh for all usage'
										: index === solarFit.value.length - 1
										? 'c/kWh for all remaining usage'
										: 'c/kWh for the next';

									return html`
										<div class="block-input">
											<div class="block-input-item">
												${FormInput({ value: fit.rate, onchange: handleTierRateChange, type: 'number', placeholder: 'Rate' })}
												<span>${spanText}</span>
											</div>
											${includeVolume && html`
												<div class="block-input-item">
													${FormInput({ value: fit.volume, onchange: handleTierVolumeChange, type: 'number', placeholder: 'kWh' })}
													<span> kWh/Day </span>
												</div>
											`}
										</div>
									`;
								})}
								${solarFit.value.length > 2 && html`
									<div class="action-buttons start">
										<button class="remove" onclick=${decrementFitTier}>Delete last tier</button>
									</div>
								`}
							`}
						</div>

						${Divider()}

						<label> Total Discount</label>
						<br/>
						<div class="double">
							<span> Discount </span>
							<div class="input-label">
								${FormInput( { type: 'number', onchange: handleTotalDiscountChange, placeholder: 'Total Discount', value: totalDiscount.value } )}
								<span> % </span>
							</div>
						</div>

					</div>
				`}
			</div>
			<br/><br/>

			${selectedRetailer.value && html`
				<button disabled=${invalidFields.value || hasDollarRate.value || loadingDefaultPlan.value} onclick=${saveEnergyPlan} class="confirm-button" id="save-energy-plan"> Confirm </button>
			`}
		`;

		// Breaks the Tou structure into multiple blocks with a single start and end time so it can be displayed in sequence filling 24h
		function breakdownTouStructure(touBlock) {
			let colors = ['var(--denim)', 'var(--punch)', 'var(--rum)', 'var(--heather)'];
			var brokenDownTimeBlocks = {};

			let daysCombinationsSet = new Set();
			for(const block of touBlock) {
				for(const timeOfUse of block.timeOfUse) {
					let days = timeOfUse.days;
					days.sort();
					let key = days.join(' & ');
					daysCombinationsSet.add(key);
				}
			}
			
			// This for block tries to find grouped days and break them down so we can have each toublock filling an exact 24h period
			// Ex: if we have 1 toublock with "Business Days | Saturday | Sunday", one for "Saturday | Sunday" and one for "Business Days", 
			// we break the days property to 2 elements "Saturday | Sunday" and "Business Days", so the rest of this method can finish grouping them on 24h periods
			for(const block of touBlock) {
				for(const timeOfUse of block.timeOfUse) {
					let days = timeOfUse.days;
					days.sort();
					let key = days.join(' & ');

					let toAdd = [];
					for(const d of daysCombinationsSet) {
						if(key != d && key.includes(d)) {
							let splitD = d.split('&').map((day) => day.trim());
							toAdd.push(splitD)
							var allD = key.split('&').map((day) => day.trim());
							allD = allD.filter(day => !splitD.includes(day));
							toAdd.push(allD);
							break;
						}
					}
					if(toAdd.length > 1) {
						timeOfUse.days = toAdd[0];
						for(var i = 1; i < toAdd.length; i++) {
							let copy = { ... timeOfUse };
							copy.days = toAdd[i];
							block.timeOfUse.push(copy);
						}
					}
				}
			}

			touBlock.forEach((block, index) => {
				block.timeOfUse.forEach((timeOfUse) => {

					let timeObj = {
						name: block.name,
						startTime: formatTime(timeOfUse.startTime),
						endTime: formatTime(timeOfUse.endTime),
						color: colors[index % colors.length],
					};

					let days = timeOfUse.days;
					days.sort();
					let key = days.join(' & ');

					brokenDownTimeBlocks[key] ??= [];
					brokenDownTimeBlocks[key].push(timeObj);
				});
			});

			for(const key of Object.keys(brokenDownTimeBlocks)) {
				brokenDownTimeBlocks[key].sort((a, b) => parseInt(a.startTime.replace(':', '')) - b.startTime.replace(':', ''));
			}

			// unset timeOfUse on touBlock
			touBlock.forEach((block) => {
				block.timeOfUse = undefined;
			});

			return {
				brokenDownBlocks: brokenDownTimeBlocks,
				touBlock: [...touBlock],
			}
		}


		function FlexiblePeriod({
			planType, 
			periods,
			handlePeriodChange, 
			multiplePeriods,
			currentPeriod,
			invalidPeriods,
			differentDailyRatesStatus,
		}) {
			const getPeriodWidget = (index) => {

				// Define whether to redefine the period data or not.
				const redefineData = 
					(periods[index].data === undefined) || 
					(periods[index].planType != planType);

				// If there's no plan loaded, set data and planType.
				if (redefineData) {
					const usedTouStructure = !differentDailyRatesStatus ? touInitialStructure : differentDailyRatesInitialStructure;
					periods[index].data = planType == SINGLE_RATE ? usageChargeInitialStructure : breakdownTouStructure(structuredClone(usedTouStructure));
					periods[index].planType = planType;
				}

				// Make the necessary changes on the data for the different daily rates.
				const changeDailyRatesData = (data) => {
					let groupedDays = [];
					let othersBlock = null;
					// Check if the Others block is present.
					if (data.brokenDownBlocks[OTHERS] !== undefined) {
						othersBlock = data.brokenDownBlocks[OTHERS];
						delete data.brokenDownBlocks[OTHERS];
					}
					// Set the Days/Groups variables values
					Object.keys(data.brokenDownBlocks).forEach(groupName => {
						if (groupName === BUSINESS_DAYS) {
							groupName = THE_BUSINESS_DAYS.join(' & ');
						}
						let splittedName = groupName.split(' & ');
						if (splittedName.includes(BUSINESS_DAYS)) {
							splittedName = [...splittedName.filter(day => day != BUSINESS_DAYS), ...THE_BUSINESS_DAYS]
						}
						groupedDays = [...groupedDays, ...splittedName];
					});
					// If there are less than 7 days, add the Others block.
					if (groupedDays.length < 7) {
						let newGroupStructure = breakdownTouStructure(structuredClone(differentDailyRatesInitialStructure));
						data.brokenDownBlocks[OTHERS] = othersBlock ?? newGroupStructure.brokenDownBlocks[OTHERS];
					}
					// Set the new data.
					changePeriodData(data);
				}
				
				const changePeriodData = (data) => {
					periods[index].data = data;
					handlePeriodChange(periods);
				}

				if(planType === SINGLE_RATE) {
					return BlockRatesInput({ 
						usageCharge: periods[index].data,
						usageChargeChanged: changePeriodData,
					});
				}

				if(planType === TIME_OF_USE) {
					let period = periods[index];
					return html` 
						<${DifferentDailyRatesSelector}
							touFullBlock=${period.data}
							differentDailyRatesStatus=${differentDailyRatesStatus}
							differentDailyRatesChanged=${changeDailyRatesData}
							newGroupStructure=${breakdownTouStructure(structuredClone(differentDailyRatesInitialStructure))}
						/>
						<${TimeOfUsePlan}
							touFullBlock=${period.data}
							touBlockChanged=${changePeriodData}
							periodLabel=${multiplePeriods ? `${period.name} ${periodRange(period, index)}` : null}
							differentDailyRatesStatus=${differentDailyRatesStatus}
							differentDailyRatesChanged=${changeDailyRatesData}
						/>
					`;
				}
			}

			const periodNameChanged = (event) => {
				periods[currentPeriod.value].name = event.target.value;
				handlePeriodChange(periods);
			}

			const periodStartDateChange = (event) => {
				let val = dayMonthOnChange(event);
				periods[currentPeriod.value].startDate = val;
				if(currentPeriod.value == 0) {
					periods[periods.length - 1].endDate = remove1Day(val);
				}else{
					periods[currentPeriod.value - 1].endDate = remove1Day(val);
				}
				handlePeriodChange(periods);
			}

			const periodEndDateChange = (event) => {
				let val = dayMonthOnChange(event);
				periods[currentPeriod.value].endDate = val;

				// Update start date of next period
				let parts = val.split('/');
				periods[currentPeriod.value + 1].startDate = '';
				if(parts.length == 2) {
					let nextDay = new Date(new Date().getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]) + 1);
					let nextDayStr = `${padNumber(nextDay.getDate())}/${padNumber(nextDay.getMonth() + 1)}`;
					if(periods[currentPeriod.value + 1]) {
						periods[currentPeriod.value + 1].startDate = nextDayStr;
					}
				}

				handlePeriodChange(periods);
			}

			const padNumber = (num) => num < 10 ? '0' + num : num;

			const remove1Day = (date) => {
				if(date == '') return '';
				let parts = date.split('/');
				let currentYear = new Date().getFullYear();
				let dateObj = new Date(currentYear, parseInt(parts[1]) - 1, parseInt(parts[0]));
				dateObj.setDate(dateObj.getDate() - 1);
				return `${padNumber(dateObj.getDate())}/${padNumber(dateObj.getMonth() + 1)}`;
			}

			const dayMonthOnChange = (e) => {
				let parts = e.target.value.split('/');
				if(parts.length == 2) {
					let day = parseInt(parts[0]);
					let month = parseInt(parts[1]);
					let currentYear = new Date().getFullYear();
					let date = new Date(currentYear, month - 1, day);
					if(date.getMonth() + 1 != month || date.getDate() != day) {
						e.target.value = '';
					}else{
						return e.target.value;
					}
				}else{
					e.target.value = '';
				}
				return '';
			}

			const newPeriod = () => {
				// Delete the value on the endDate as it was fixed as the first period stateDate - 1 day
				periods[periods.length - 1].endDate = '';
				periods.push({ name: `Period ${periods.length + 1}`, startDate: '', endDate: remove1Day(periods[0].startDate) });
				handlePeriodChange(periods);
				currentPeriod.value = periods.length - 1;
			}

			const deleteCurrentPeriod = () => {
				periods.splice(currentPeriod.value, 1);
				handlePeriodChange(periods);
				if(currentPeriod.value >= periods.length) currentPeriod.value = periods.length - 1;
			}

			const onSupplyChargeChange = (event) => {
				periods[currentPeriod.value].dailySupplyCharge = event.target.value;
				handlePeriodChange(periods);
			}

			const onDemandChargeChange = (event) => {
				const newDemandCharge = event.target.value ? parseFloat(event.target.value) : null;
				periods[currentPeriod.value].demandCharge = newDemandCharge;
				handlePeriodChange(periods);
			};

			const toggleDemandCharge = () => {
				if (showDemandCharge.value) {
					periods[currentPeriod.value].demandCharge = null; // Clear the value when hiding
				}
				showDemandCharge.value = !showDemandCharge.value;
				handlePeriodChange(periods); // Trigger an update to ensure reactivity
			};

			const controlledLoadChanged = (clData) => {
				let data = periods[currentPeriod.value].data;
				data.controlledLoad = clData;
				periods[currentPeriod.value].data = data;
				handlePeriodChange(periods);
			}

			const periodRange = (period, index) => {
				let dates = [];
				if (period.startDate !== '') {
					dates.push(period.startDate);
					if (index !== periods.length - 1) {
						if (period.endDate !== '') {
							dates.push(period.endDate);
						}
					} else if (periods[0].startDate !== '') {
						dates.push(remove1Day(periods[0].startDate));
					}
				}
				if(dates.length == 0) return '';
				return `(${dates.join(' - ')})`;
			}

			function SupplyCharge() {
				const period = periods[currentPeriod.value] ?? {};
				const supplyLooksLikeDollars = looksLikeDollars(period.dailySupplyCharge, 2);
				const demandLooksLikeDollars = looksLikeDollars(period.demandCharge);

				return html`
				<div>
					<div class="double">
						<div>
							<label>Supply Charge</label>
							<span> Enter the rates including GST </span>
						</div>
						<div class="action-buttons">
							${!showDemandCharge.value && html`<button class="button-add" onclick=${toggleDemandCharge}><div class="icon-add"></div>Add demand charge</button>`}
							${showDemandCharge.value && html`<button class="button-remove" onclick=${toggleDemandCharge}><div class="icon-trash"></div>Remove demand charge</button>`}
						</div>
					</div>
					<br/><br/>
					<div class="double">
						<span> Rate </span>
						<div class="input-label">
							${FormInput( { type: 'number', placeholder: 'Supply Charge', value: periods[currentPeriod.value].dailySupplyCharge ?? '', onchange: onSupplyChargeChange } )}
							<span> c/day </span>
						</div>
					</div>
					${supplyLooksLikeDollars && html`
						<div class="block-rate-warning">Please enter the supply charge in cents per day, not dollars.<br />For example: $1.35/day → 135</div>
					`}
					${showDemandCharge.value && html`
						<div class="double">
							<span> Demand Charge </span>
							<div class="input-label">
								${FormInput({ type: 'number', placeholder: 'Demand Charge', value: periods[currentPeriod.value].demandCharge ?? '', onchange: onDemandChargeChange })}
								<span> c/kW/day </span>
							</div>
						</div>
						${demandLooksLikeDollars && html`
							<div class="block-rate-warning">Please enter the demand charge in cents per kW per day, not dollars.<br />For example: $0.16 → 16</div>
						`}
					`}
				</div>
				`;
			}

			function ControlledLoad() {
				
				let block = periods[currentPeriod.value].data.controlledLoad;

				if(block == null) return html``;

				return html`
					<div class="controlled-load">
						<!--- TODO --->
					</div>
				`;
			}

			function editTariffsNote() {
				return html`
					<div class="edit-tariffs-note">
						${foundDefaultPlan.value && html`
							<span> <p class="adjust"> We have loaded an energy plan that matches your postcode, retailer, and plan type </p> </span>
							<span> <p class="adjust"> Please adjust the tariffs to match your plan's </p> </span>
						`}
						${!foundDefaultPlan.value && html`
							<span> <p class="adjust"> We couldn't find an energy plan that matches your postcode, retailer, and plan type </p> </span>
							<span> <p class="adjust"> Please add your plan's tariffs below </p> </span>
						`}
					</div>
					${Divider()}
				`;
			}

			const currentPeriodChanged = (event) => {
				currentPeriod.value = parseInt(event.target.value);
			}

			let currentPeriodObj = periods[currentPeriod.value];

			let showHorizontalDivider = true;
			if (currentPeriodObj.data && currentPeriodObj.data.touBlock) {
				showHorizontalDivider = !!currentPeriodObj.data.touBlock.filter((block) => block.name).length;
			}
			return html`
				${editTariffsNote()}
				<div class="double">
					${multiplePeriods && html `
						<label> Period </label>
						${periods.length < 5 && html `
							<div class="action-buttons"> 
								<button class="button-add" onclick=${newPeriod}><div class="icon-add"></div>Add Period</button>
							</div>
						`}
					`}
				</div>

				${multiplePeriods && html`
					<br/>
					<div class="dropdown-container has-pseudo-select">
						<select value="${currentPeriod.value}" onchange="${currentPeriodChanged}">
							${periods.map((period, index) => {
								return html`<option value="${index}"> ${period.name} <span>${periodRange(period, index)}</span> </option>`;
							})}
						</select>
						<div class="pseudo-select-overlay">
							<span> ${currentPeriodObj.name} <span>${periodRange(currentPeriodObj, currentPeriod.value)}</span> </span>
						</div>
					</div>

					<div class="periods">
						<div class="period-header double"> 
							<span>Period Name</span> 
							${FormInput( { type: 'text', value: periods[currentPeriod.value].name, onchange: periodNameChanged } )}
						</div>
						${currentPeriod.value > 1 && html `<div class="action-buttons"><button class="delete-period" onclick=${deleteCurrentPeriod}>Delete Period</button></div>`}
						<div class="double">
							<span> Dates </span>
							<div class="period-dates">
								${FormInput( {
									class: 'day-month-input',
									value: periods[currentPeriod.value].startDate, 
									oninput: dayMonthMask,
									type: 'text', placeholder:'dd/mm', maxlength: 5, onchange: periodStartDateChange } 
								)}
								<span> to </span>
								${FormInput( {
									class: 'day-month-input', disabled: currentPeriod.value == periods.length - 1,
									value: currentPeriod.value != periods.length - 1 ? periods[currentPeriod.value].endDate : remove1Day(periods[0].startDate),
									oninput: dayMonthMask,
									type: 'text', placeholder:'dd/mm', maxlength: 5, onchange: periodEndDateChange } 
								)}
							</div>
						</div>
						${Divider()}
						${getPeriodWidget(currentPeriod.value)}
						${showHorizontalDivider && Divider(true)}
						${SupplyCharge()}
						${invalidPeriods.length > 0 && currentPeriod.value + 1 < periods.length && html`
							<div class="invalid-periods">
								<button onclick=${() => { currentPeriod.value = currentPeriod.value+1; }}>Complete next period <span> (${periods[currentPeriod.value + 1].name}) </span></button>
							</div>
						`}
					</div>
				`}
				${!multiplePeriods && html`
					${getPeriodWidget(currentPeriod.value)}
					${showHorizontalDivider && Divider()}
					${SupplyCharge()}
				`}
			`;
		}
	}

	function FormInput( { key, value, onchange, type, placeholder='', oninput, requiredInput=true, disabled=false, classes='', step}) {
		let invalid = !disabled && requiredInput && (value ?? '') === '';

		// Set a default step if type is 'number' and step is not provided
		const stepAttr = type === 'number' && !step ? 'any' : step;

		return html `
			<input 
				value="${value}"
				onchange="${onchange}"
				oninput="${oninput}"
				disabled="${disabled}"
				type="${type}" 
				step="${stepAttr}"
				placeholder="${placeholder}"
				class="${invalid ? 'missing-required': ''} ${classes}"
			/>
		`;
	}

	function SingleTimePeriod({ startTime, endTime, handleStartChanged, handleEndChanged, startDateDisabled=false, endDateDisabled=false, placeholder='', initialStartTime='00:00' }) {
		const changeStartTime = (event) => {
			let val = event.target.value;
			if (val.length < 3) {
				const valHourInt = parseInt(val);
				if (valHourInt >= 0 && valHourInt <= 23) {
					val = `${valHourInt}:00`;
				} else {
					handleEndChanged('');
					return;
				}
			} else if(val.length < 5) {
				handleStartChanged('');
				return;
			}
			let valInt = parseTime(val);
			let valRounded = roundToNearest30(valInt);
			if (valInt != valRounded) {
				valInt = valRounded;
				val = formatTime(valInt);
			} 
			if((endTime ?? '') != '') {
				let endT = parseTime(endTime);
				if(valInt >= endT) val = formatTime(endT);
			}
			if(valInt % 100 >= 60) {
				valInt -= (valInt % 100);
				val = formatTime(valInt);
			}
			handleStartChanged(val);
		}

		const changeEndTime = (event) => {
			let val = event.target.value;
			if (val.length < 3) {
				const valHourInt = parseInt(val);
				if (valHourInt >= 0 && valHourInt <= 23) {
					val = `${valHourInt}:00`;
				} else {
					handleEndChanged('');
					return;
				}
			} else if(val.length < 5) {
				handleEndChanged('');
				return;
			}
			let valInt = parseTime(val);
			let valRounded = roundToNearest30(valInt);
			if (valInt != valRounded) {
				valInt = valRounded;
				val = formatTime(valInt);
			} 
			let startT = parseTime(startTime);
			let initialT = parseTime(initialStartTime);
			if(valInt <= startT && valInt > initialT) val = formatTime(startT);
			if(valInt % 100 >= 60) {
				valInt -= (valInt % 100);
				val = formatTime(valInt);
			}

			// do not accept invalid times
			if(valInt > 2359) {
				handleEndChanged('');
				return;
			}

			handleEndChanged(val);
		}

		return html`
			<div class="single-time-period">
				${FormInput( { oninput: timeMask, onchange: changeStartTime, disabled: startDateDisabled, type: 'text', maxlength: 5, value: startTime, placeholder: placeholder } )}
				<span> to </span>
				${FormInput( { oninput: timeMask, onchange: changeEndTime, disabled: endDateDisabled, type: 'text', maxlength: 5, value: endTime, placeholder: placeholder } )}
			</div>
		`;
	}

	function roundToNearest30 (valInt) {
			let hours = Math.floor(valInt / 100);
			let minutes = valInt % 100;

			if (minutes < 15) {
				minutes = 0;
			} else if (minutes < 45) {
				minutes = 30;
			} else {
				hours += 1;
				minutes = 0;
			}

			return hours * 100 + minutes;
	};

	function Divider(transparent = false) {
		return html`<div style="${transparent ? 'background: none;' : ''}" class="divider"></div>`;
	}

	const sortWeekdaysBlock = (days) => {
		return days.sort((a, b) => (DAY_ORDER[a] || 99) - (DAY_ORDER[b] || 99));
	}

	const getGroupName = (groupName) => {
		return sortWeekdaysBlock(groupName.split(' & ')).join(' & ');
	}

	const getGroupShortName = (groupName) => {
		if (groupName == BUSINESS_DAYS || groupName == OTHERS) {
			return groupName;
		}
		return sortWeekdaysBlock(groupName.split(' & ')).map(day => day.slice(0, 3)).join(' & ');
	}

	// Check if two arrays are equal
	const arraysEqual = (arr1, arr2) => {
		if (arr1.length !== arr2.length) return false;
		return arr1.every((value, index) => value === arr2[index]);
	}
	
	class DifferentDailyRatesSelector extends Component {

		constructor(props) {
			super(props);
		}

		render(props, state) {

			// Constants
			const differentDailyRatesStatus = props.differentDailyRatesStatus;
			const differentDailyRatesChanged = props.differentDailyRatesChanged;
			const addNewGroupStructure = props.newGroupStructure.brokenDownBlocks[OTHERS];

			if (!differentDailyRatesStatus) {
				return html ``;
			}

			// The weekdays broken down blocks.
			let data = props.touFullBlock;

			// Signals variables.
			let group = useSignal([]);
			let removals = useSignal([]);
			let groupIndex = useSignal(""); // The index of the group that is being set.
			let daysDisposition = useSignal({}); // The disposition of the days.

			// Days/Groups variables.
			let groups = []; // The groups that are already created.
			let currentGroup = []; // The current group.
			let lastSelection = [] // The last group selection.
			let groupedDays = []; // The days that are already grouped.

			// The days that are available to be grouped.
			let availableDays = [ MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY ];

			// Set the Days/Groups variables values
			Object.keys(data.brokenDownBlocks).forEach(groupName => {
				let days = groupName.split(' & ');
				if (days.includes(BUSINESS_DAYS)) {
					days = [...days.filter(day => day != BUSINESS_DAYS), ...THE_BUSINESS_DAYS].sort();
				}
				let index = days.sort().map(day => day.slice(0, 3)).join('');
				groups.push({'index': index, 'name': groupName});
				if (days.join('') == OTHERS) {
					return;
				}
				if (index == groupIndex) {
					currentGroup = [...days].filter(day => !removals.value.includes(day));
					lastSelection = [...days];
				}
				groupedDays = [...groupedDays, ...days].filter(day => !removals.value.includes(day));
				availableDays = availableDays.filter(day => !groupedDays.includes(day));
			});

			// Check if the current index is present on the groups
			if (groupIndex.value != "" || availableDays.length == 0) {
				if (!groups.find(group => group.index == groupIndex.value)) {
					groupIndex.value = !!availableDays.length ? "" : groups[0].index;
				}
			}

			// Update the disposition of the days.
			daysDisposition.value = {
				currentGroup: [...currentGroup, ...group.value],
				groupedDays: [...groupedDays, ...group.value],
				availableDays,
			}

			const clickDay = (newValue, day) => {
				let currentDayGroup = [...currentGroup, ...group.value].filter(
					(item, index, arr) => 
					arr.indexOf(item) === index
				);
				// If the day is already in the group, remove it.
				if (currentDayGroup.includes(day)) {
					removals.value = [...removals.value, day];
					group.value = currentDayGroup.filter((i) => i != day);
				// If the day is not in the group, add it.
				} else {
					currentDayGroup.push(day);
					group.value = currentDayGroup;
				}
			}

			const addUpdateGroup = () => {
				// Set the new group.
				let selectedGroup = group.value;
				// If there's no group selected, return.
				if (selectedGroup.length == 0) {
					return;
				}

				// If the selected group contain all elements of the THE_BUSINESS_DAYS change them for BUSINESS_DAYS.
				if (getGroupShortName(selectedGroup.sort().join(' & ')).includes(getGroupShortName(THE_BUSINESS_DAYS.sort().join(' & ')))) {
					selectedGroup = selectedGroup.filter(day => !THE_BUSINESS_DAYS.includes(day));
					selectedGroup.push(BUSINESS_DAYS);
					selectedGroup = selectedGroup.sort();
				}
				
				// If there's a group index, delete the block for the selected group.
				// Add the block for the selected group
				let structure = addNewGroupStructure;
				if (groupIndex.value != "") {
					let lastSelectionIndex = lastSelection.sort().join(' & ');

					// If the last selection contains all elements of the THE_BUSINESS_DAYS change them for BUSINESS_DAYS.
					if (getGroupShortName(lastSelectionIndex).includes(getGroupShortName(THE_BUSINESS_DAYS.sort().join(' & ')))) {
						lastSelectionIndex = lastSelectionIndex.split(' & ').filter(day => !THE_BUSINESS_DAYS.includes(day));
						lastSelectionIndex.push(BUSINESS_DAYS);
						lastSelectionIndex = lastSelectionIndex.sort().join(' & ');
					}

					structure = data.brokenDownBlocks[lastSelectionIndex]; // Get the lastSelection group.
					delete data.brokenDownBlocks[lastSelectionIndex];
				}
				data.brokenDownBlocks[selectedGroup.sort().join(' & ')] = structure;
				// Set the group index.
				groupIndex.value = selectedGroup.sort().map(day => day.slice(0, 3)).join('');
				// Call the parent function.
				differentDailyRatesChanged(data);
				// Reset the group.
				group.value = [];
				removals.value = [];
			}

			const changeGroup = (event) => {
				groupIndex.value = event.target.value;
				group.value = [];
				removals.value = [];
			}

			return html`
				<div class="double">
					<label> Groups </label> 
					<div style="display: flex;">
						<div class="borderless-dropdown pseudo-dropdown week-group-dropdown" style="flex">
							<select value="${groupIndex.value}" onchange="${changeGroup}">
								${!!availableDays.length && html`<option value=""> New group </option>`}
								${groups.map((group) => {
									return html`<option value="${group.index}" disabled=${group.name == OTHERS}> ${ getGroupShortName(group.name) } </option>`;
								})}
							</select>
						</div>
					</div>
				</div>
				<br/>
				<div style="display: flex;">
					<div class="" style="width: 32%">
						<${DailyRatesCheckboxes} label="${SUNDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
						<${DailyRatesCheckboxes} label="${MONDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
						<${DailyRatesCheckboxes} label="${TUESDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
					</div>
					<div class="" style="width: 32%">
						<${DailyRatesCheckboxes} label="${WEDNESDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
						<${DailyRatesCheckboxes} label="${THURSDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
						<${DailyRatesCheckboxes} label="${FRIDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
					</div>
					<div class="" style="width: 32%">
						<${DailyRatesCheckboxes} label="${SATURDAY}" disposition="${daysDisposition.value}" onChange="${clickDay}"/>
						<button disabled=${!group.value.length} onclick=${addUpdateGroup} class="confirm-button weekdays-confirmation" id="save-weekday-structure">
							${!!groupIndex.value ? 'Update' : 'Add new'}
						</button>
					</div>
				</div>
				${Divider()}
			`;
		}
	}

	export class DailyRatesCheckboxes extends Component {
		constructor(props) {
			super(props);
			this.state = {
				label: props.label ?? "",
			}
		}
		render(props, state) {
			// Destructure the state object
			let { label, checked } = state;
			// Create a id with the label in lower case and replace spaces with hyphens.
			const id = label.toLowerCase().replace(/ /g, '-');
			// Set the checkbox to checked if the day is in the current group
			checked = props.disposition.groupedDays.includes(props.label);
			// Set the checkbox to disabled if the day is already grouped and it's not the current group
			const disabled = props.disposition.groupedDays.includes(label) && !props.disposition.currentGroup.includes(label);
			// Function to handle the switch toggle
			const toggleSwitch = () => {
				if (disabled) {
					return;
				}
				const newChecked = !checked;
				this.setState({
					checked: newChecked,
				});
				if (props.onChange) {
					props.onChange(newChecked, label);
				}
			}
			// Using the imported CSS for styling
			return html`
				<link rel="stylesheet" href="/js/preact/components/checkbox/checkbox.css"/>
				<div 
					id="${id}" 
					class="checkbox-container ${checked && !disabled == true ? 'checked' : ''} ${disabled == true ? 'disabled' : ''}" 
					onclick=${toggleSwitch}>
					<span class="checkbox"/>
					<label for="${id}">${label}</label>
				</div>
			`;
		}
	}

	class TimeOfUsePlan extends Component {

		constructor(props) {
			super(props);
			this.state = {
				touExpanded: new Set(),
			}
		}
		
		render(props, state) {
			
			let touBlock = props.touFullBlock.touBlock;
			let brokenDownBlocks = props.touFullBlock.brokenDownBlocks;

			// Check if a tou block name is already in used
			// This is used to avoid block name duplication
			const isBlockUsed = (blockName) => {
				let broken = props.touFullBlock.brokenDownBlocks;
				for(const day of Object.keys(broken)) {
					let brokenDownBlockList = broken[day];
					if(brokenDownBlockList.some((block) => block.name == blockName)) return true;
				}
			}

			return html `
				<${TimesOfUseBlocks}
					touBlock=${touBlock}
					brokenDownBlocks=${brokenDownBlocks}
					brokenDownBlocksChanged=${(blocks) => {
						props.touFullBlock.brokenDownBlocks = blocks;
						props.touBlockChanged(props.touFullBlock);
					}}
					handleAddNewTouBlock=${(blockName) => {
						touBlock.push({ name: blockName, blockRates: [{ rate: null, volume: null }], blockPeriod: 'D', custom: true });
						props.touBlockChanged(props.touFullBlock);
					}}
					periodLabel=${props.periodLabel}
					differentDailyRatesStatus=${props.differentDailyRatesStatus}
					differentDailyRatesChanged=${props.differentDailyRatesChanged}
					touFullBlock=${props.touFullBlock}
				/>
				<label class="info"> ${props.periodLabel} </label>
				<div class="tou-times">
					${touBlock.map((block, index) => {
						if (!block.name) {
							return;
						}

						const blockRatesChanged = (data) => {
							touBlock[index].blockRates = data.blockRates;
							touBlock[index].blockPeriod = data.blockPeriod;
							props.touBlockChanged(props.touFullBlock);
						}

						let expanded = state.touExpanded.has(block.name);

						const toggleExpand = () => {
							if(expanded) {
								state.touExpanded.delete(block.name);
							}else{
								state.touExpanded.add(block.name);
							}
							this.setState(state);
						}

						var valid = true;
						for(var i = 0; i < block.blockRates.length; i++) {
							if(i < block.blockRates.length - 1 && (block.blockRates[i].volume ?? '') == '') valid = false;
							if((block.blockRates[i].rate ?? '') == '') valid = false;
						}

						return html`
							<div class="tou-block ${expanded ? '' : `collapsed`} ${valid ? '' : 'invalid'}">
								<div onclick=${toggleExpand} class="double expandable-header">
									<span> ${block.name} ${block.name.toLowerCase().includes('rate') ? '' : 'Rate'} </span>
									<div class="expandable ${expanded ? 'icon-chevron-up' : 'icon-chevron-down'}"></div>
								</div>
								${expanded && html `
									<br/>
									${!isBlockUsed(block.name) && html`<button class="remove-tariff" onclick=${() => { touBlock.splice(index, 1); props.touBlockChanged(props.touFullBlock); }}>Delete Tariff</button>`}
									${BlockRatesInput({ usageCharge: block, usageChargeChanged: blockRatesChanged })}
								`}
							</div>
						`;
					})}
				</div>
			`;
		}
	}

	function BlockRatesInput({ usageCharge, usageChargeChanged }) {

		const blockPeriod = usageCharge.blockPeriod;
		const blockRates = usageCharge.blockRates;

		const blockPeriodLabel = () => {
			switch(blockPeriod) {
				case 'D':
					return 'Day';
				case 'M':
					return 'Month';
				case '3M':
					return 'Quarter';
				case 'Y':
					return 'Year';
			}
		}

		const handleBlockPeriodChange = (event) => {
			usageCharge.blockPeriod = event.target.value;
			usageChargeChanged(usageCharge);
		}

		const incrementBlock = () => {
			usageCharge.blockRates.push({ rate: null, volume: null });
			usageChargeChanged(usageCharge);
		}

		const decrementBlock = () => {
			usageCharge.blockRates.pop();
			usageChargeChanged(usageCharge);
		}

		function blocks() {
			const blocks = [];
			for(let i = 0; i < usageCharge.blockRates.length; i++) {
				const showRateWarning = looksLikeDollars(usageCharge.blockRates[i].rate);

				var spanText = '';
				var includeVolume = false;
				if(i == 0) {
					if(usageCharge.blockRates.length > 1) {
						spanText = 'c/kWh for the first';
					} else {
						spanText = 'c/kWh for all usage';
					}
				}else{
					if(i == usageCharge.blockRates.length - 1) {
						spanText = 'c/kWh for all remaining usage';
					} else {
						spanText = 'c/kWh for the next';
					}
				}

				if(i < usageCharge.blockRates.length - 1) {
					includeVolume = true;
				}

				let rateChanged = (event) => {
					usageCharge.blockRates[i].rate = event.target.value;
					usageChargeChanged(usageCharge);
				}

				let volumeChanged = (event) => {
					usageCharge.blockRates[i].volume = event.target.value;
					usageChargeChanged(usageCharge);
				}

				blocks.push(html`
					<div class="block-input">
						<div class="block-input-item">
							${FormInput( { value: usageCharge.blockRates[i].rate, onchange: rateChanged, type: 'number', placeholder: 'Rate', requiredInput: true } )}
							<span>${spanText}</span>
						</div>
						${includeVolume && html`
							<div class="block-input-item">
								${FormInput( { value: usageCharge.blockRates[i].volume, onchange: volumeChanged, type: 'number', placeholder: 'kWh' } )}
								<span> kWh / ${blockPeriodLabel()} </span>
							</div>
						`}
						${showRateWarning && html`
							<div class="block-rate-warning">Please enter this rate in cents per kWh, not dollars.<br />For example: $0.36 → 36</div>
						`}
					</div>
				`);
			}
			return html`
				<br/>
				<div class="double">
					<span> Blocks </span>
					<div class="action-buttons">
						<button class="button-add" onclick=${incrementBlock}><div class="icon-add"></div>Add new block</button>
					</div>
				</div>
				<div class="blocks">
					${blocks}
				</div>
			`;
		}

		return html`
			<div>
				<label class="sub">Usage</label>
				<span> Enter the rates including GST </span>
			</div>
			${usageCharge.blockRates.length > 1 && html`
				<div class="block-period double">
					<span> Block Period </span>
					<div class="dropdown-container">
						<select value="${blockPeriod}" onchange="${handleBlockPeriodChange}">
							<option value="D">Day</option>
							<option value="M">Month</option>
							<option value="3M">Quarter</option>
							<option value="Y">Year</option>
						</select>
					</div>
				</div>
			`}
			${blocks()}
			${usageCharge.blockRates.length > 1 && html `
				<div class="action-buttons start">
					<button class="remove" onclick=${decrementBlock}>Delete last block</button>
				</div>
			`}
		`;
	}


	class TimesOfUseBlocks extends Component {

		constructor(props) {
			super(props);
			this.state = {}
		}

		render(props, state) {

			let blocksNames = props.touBlock.map((block) => block.name);
			let groups = [];
			Object.keys(props.brokenDownBlocks).forEach(groupName => {
				let days = groupName.split(' & ');
				let index = days.sort().map(day => day.slice(0, 3)).join('');
				groups.push({'index': index, 'name': groupName});
			});

			return html`
				${Object.keys(props.brokenDownBlocks).map((day) => {

					let blocks = props.brokenDownBlocks[day];

					let groupIndex = day.split(' & ').sort().map(day => day.slice(0, 3)).join('');

					let groupLabel = sortWeekdaysBlock(day.split(' & ')).join(' & ');

					const changeBlockName = (index, value) => {
						let indexKey = `${day}-${index}`;
						
						let newBlockName = value;

						if(state.addingCustomBlockNameIndex != null && blocksNames.includes(newBlockName)) {
							alert('This name is already in use');
							return;
						}

						if((newBlockName ?? '') != '') {
							blocks[index].name = newBlockName;
							props.brokenDownBlocksChanged(props.brokenDownBlocks);
						}
						
						if(state.addingCustomBlockNameIndex != null) {
							props.handleAddNewTouBlock(newBlockName);
							state.addingCustomBlockNameIndex = null;
							state.customBlockNameInput = '';
						}

						this.setState(state);
					}

					const copyGroup = (event) => {
						let data = props.touFullBlock;
						let targetIndex = event.target.value;
						data.brokenDownBlocks[day] = structuredClone(props.touFullBlock.brokenDownBlocks[groups.find(group => group.index == targetIndex).name]);
						props.differentDailyRatesChanged(data)
					}

					const removeGroup = () => {
					let data = { ...props.touFullBlock, brokenDownBlocks: { ...props.touFullBlock.brokenDownBlocks } };
					if (data.brokenDownBlocks.hasOwnProperty(day)) {
						delete data.brokenDownBlocks[day];
						props.differentDailyRatesChanged(data);
					}
				};

					const handleAddBlock = () => {
						if (!blocks || !Array.isArray(blocks)) return;
						blocks.push({ name: null, startTime: '', endTime: '' });
						if (blocks.length > 1) {
							blocks[blocks.length - 2].endTime = '';
							blocks[blocks.length - 1].endTime = blocks[0]?.startTime || ''; 
						}
						props.brokenDownBlocksChanged(props.brokenDownBlocks);
					}

					const handleDeleteBlock = () => {
						blocks.pop();

						blocks[blocks.length - 1].startTime = blocks[blocks.length - 2].endTime;
						blocks[blocks.length - 1].endTime = blocks[0].startTime;

						props.brokenDownBlocksChanged(props.brokenDownBlocks);
					}

					return html`
						<div class="block-group-info">
							<label> ${day == 'all' ? 'All Days' : groupLabel} </label>
							${props.periodLabel && html `<span class="info"> ${props.periodLabel} </span>`}
						</div>
					
						<div class="double">
							${ 	groups.length > 1 &&
								props.differentDailyRatesStatus &&  html`
								<div>
									<div style="display: flex;">
										<div class="borderless-dropdown pseudo-dropdown week-group-dropdown" style="flex">
											<select value="" onchange="${copyGroup}">
												<option value=""> Copy from </option>
												${groups.map((group) => {
													if (group.index == groupIndex) {
														return html``;
													}
													return html`<option value="${group.index}"> ${ getGroupShortName(group.name) } </option>`;
												})}
											</select>
										</div>
									</div>
								</div>
							`}
							<div>
								${ props.differentDailyRatesStatus && day != OTHERS && html `
									<div class="action-buttons">
										<button class="button-remove remove" onclick=${removeGroup}><div class="icon-trash"></div>Remove Group</button>
									</div>
								`}
								<div class="action-buttons">
									<button disabled=${state.editingBlockNameIndex ? true : false} class="button-add" onclick=${handleAddBlock}><div class="icon-add"></div>Add new time period</button>
								</div>
							</div>
						</div>

						<div class="time-of-use-broken-down-blocks">
							${blocks.map((block, index) => {

								let indexKey = `${day}-${index}`;
								let startDateDisabled = (index > 0);
								let endDateDisabled = (index == blocks.length - 1);

								let firstBlockStartTime = blocks[0].startTime;

								const removeIndex = () => {
									if (blocks.length == 1) return;
									if (index < 0 || index >= blocks.length) return;
									blocks.splice(index, 1);
									if (blocks.length === 0) return;
									if (index === 0) {
										blocks[blocks.length - 1].endTime = blocks[0].startTime;
									} else if (index == blocks.length) {
										blocks[index-1].endTime = blocks[0].startTime;
									} else if (index < blocks.length) {
										blocks[index].startTime = blocks[index - 1].endTime;
									}
									props.brokenDownBlocksChanged(props.brokenDownBlocks);
								}

								const changeStartTime = (val) => {
									blocks[index].startTime = val;
									if(index == 0) {
										if (parseTime(val) == 0) {
											val = '23:59';
										} else {
											const modEndTime = parseTime(val) % 100;
											val = (modEndTime == 29 || modEndTime == 59) ? parseTime(fit.endTime) : parseTime(fit.endTime) - 1;
										}
										blocks[blocks.length - 1].endTime = val;
									}

									props.brokenDownBlocksChanged(props.brokenDownBlocks);
								}

								const changeEndTime = (val) => {
									blocks[index].endTime = val;
									if(index != blocks.length - 1) {
										blocks[index + 1].startTime = val;
									}

									let startTime = parseTime(blocks[0].startTime);

									// Add a day offset to the time to facilitate the calculations
									const fixTime = (time) => time <= startTime ? time + 2400 : time;
								
									// If the last block ends before the first block, we need to remove the end time as it's invalid
									for(var i = index ; i <= blocks.length -1; i++) {
										var startI = parseTime(blocks[i].startTime);
										if(i != 0) startI = fixTime(startI);
										let endI = fixTime(parseTime(blocks[i].endTime));
										if(startI > endI) {
											blocks[i].endTime = '';
										}
									}

									props.brokenDownBlocksChanged(props.brokenDownBlocks);
								}

								const customBlockNameCancel = () => {
									state.addingCustomBlockNameIndex = null;
									this.setState(state);
								}
								const blockNameChanged = (event) => {
									if(event.target.value === 'new') {
										this.state.addingCustomBlockNameIndex = index;
										this.state.addingCustomBlockNameDay = day;
										this.setState(this.state);
									}else{
										changeBlockName(index, event.target.value);
									}
								}

								const customNameChanged = (event) => {
									this.state.customBlockNameInput = event.target.value;
									this.setState(this.state);
								}

								let addingCustom = state.addingCustomBlockNameIndex == index && state.addingCustomBlockNameDay == day;

								return html`
									<div class="broken-down-block">
										<div class="double">
											<div class="borderless-dropdown week-group-dropdown ${!addingCustom ? 'pseudo-dropdown' : ''} ${(block.name ?? '') == '' ? 'missing-required' : ''}" style="flex">
												${!addingCustom && html`
													<select value="${block.name}" onchange="${blockNameChanged}">
														<option value=""> Select </option>
														${blocksNames.map((name) => {
															if (name == '' || name == null) return html``;
															return html`<option value="${name}"> ${name} </option>`;
														})}
														<option value="new"> New Tariff </option>
													</select>
												`}
												${addingCustom  && html`
													${FormInput( { classes: 'custom-tou', value: state.customBlockNameInput, onchange: customNameChanged, type: 'text', placeholder: 'Period name' } )}
													<div class="custom-tou-buttons" style="display: block;">
														<button onclick=${() => { changeBlockName(index, state.customBlockNameInput) }}> Save </button>
														<button class="cancel" onclick=${customBlockNameCancel}> Cancel </button>
													</div>
												`}
											</div>
											<div>
												${SingleTimePeriod({ 
													initialStartTime: firstBlockStartTime,
													startTime: block.startTime, 
													endTime: block.endTime, 
													handleStartChanged: changeStartTime, 
													handleEndChanged: changeEndTime,
													startDateDisabled: startDateDisabled,
													endDateDisabled: endDateDisabled,
												})}
												${ blocks.length > 1 ? html`<div onclick=${removeIndex} class="delete-wrapper icon-trash"></div>` : html`<div class="delete-wrapper"></div>`}
											</div>
										</div>
									</div>
								`;
							})}
						</div>
						${Divider()}
					`;
				})}
			`;
		}
	}


	function formatDateInDDMM (date) {
		if(date == '') return '';
		if(date.includes('/')){
			let parts = date.split('/');
			return parts[0] + '/' + parts[1];
		}else{
			let parts = date.split('-');
			return parts[2] + '/' + parts[1];
		}
	}

	function formatTime (time)  {
		if (typeof time === 'string' && time.includes(':')) return time;
		if(time % 100 == 59) time += 41;
		if (time >= 2400) time = 2359;
		let hours = Math.floor(time / 100);
		let minutes = time % 100;
		let minutesStr = minutes < 10 ? '0' + minutes : minutes;
		let hoursStr = hours < 10 ? '0' + hours : hours;
		return hoursStr + ':' + minutesStr;
	}

	function parseTime(time) {
		return parseInt(time.replace(':', ''));
	};

	function dayMonthMask(e) {
		var input = e.target.value;

		// Remove all non-digits
		input = input.replace(/\D/g, '');

		// Add slash after 2 digits
		if (input.length > 2) {
			input = input.substring(0, 2) + '/' + input.substring(2, 4);
		}

		e.target.value = input;
	}

	function timeMask(e) {
		var input = e.target.value;

		// Remove all non-digits
		input = input.replace(/\D/g, '');

		// Add colon after 2 digits
		if (input.length > 2) {
			input = input.substring(0, 2) + ':' + input.substring(2, 4);
		}

		e.target.value = input;
	}

	function toTitleCase(str) {
		return str.split(/[-_\s]+/) // Split the string by spaces, underscores, or dashes
			.map(word => 
				word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize first letter and make rest lowercase
			)
			.join(' '); // Join the words with a space
	}

	window.renderCreateEnergyPlanPopup = ({ container, ajaxSearchDefaultPlan, onPlanSaved, initialEnergyPlan, initialRatesStructure }) => {

		// Do a copy of the initial rates structure to avoid modifying the original object, which is used in other parts of the calculator
		initialEnergyPlan = JSON.parse(JSON.stringify(initialEnergyPlan));
		initialRatesStructure = JSON.parse(JSON.stringify(initialRatesStructure));
		
		const component = html`
        <${CreateEnergyPlanPopup} 
            ajaxSearchDefaultPlan=${ajaxSearchDefaultPlan} 
            onPlanSaved=${onPlanSaved} 
            initialEnergyPlan=${initialEnergyPlan}
            initialRatesStructure=${initialRatesStructure}
        />
    `;
    render(component, container);

    // Access resetForm directly from the component function
    const resetForm = CreateEnergyPlanPopup.resetForm;

    // Hook into close button
    $(container).find('.close').on('click', () => {
      if (resetForm) resetForm();
    });

		const observer = new MutationObserver(() => {
			let boxOuter = $(container).parents('.box-outer').first();
			if (boxOuter.length) {
				$(boxOuter).find('.close').on('click', () => {
					if (resetForm) resetForm();
				});
				observer.disconnect(); // Stop watching
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });

    // Extend $.closePopup to call resetForm
    const originalClosePopup = $.closePopup;
    $.closePopup = function (t) {
			originalClosePopup(t);
			if (resetForm) resetForm();
    };
	}
</script>		<script type="module">
	// Downloaded from https://npm.reversehttp.com/@preact/signals-core,@preact/signals,htm/preact,preact
	import { render, html, useSignal, signal, effect, Component } from '/js/preact/preact_signals.js'
	import { Tags } from '/js/preact/components/tags/tags.js';

	export function SelectEnergyPlanPopup({ plansList, onPlanPicked, selectedPlan }) {

		
		const defaultPeriodsStructure = [{ name: 'Summer', startDate: '', endDate: '', dailySupplyCharge: '' }, { name: 'Winter', startDate: '', endDate: '', dailySupplyCharge: '' }];

		const searchQuery = useSignal('');
		const limit = useSignal(50);

		const searchPlans = (event) => {
			searchQuery.value = event.target.value;
		}

		const onPlanSelected = (plan) => {
			onPlanPicked(plan);
		}
		
		let filteredPlans = plansList.filter(plan => {
			let searchTerms = [
				(plan.summary.fit ?? '') != '' ? `FiT: ${plan.summary.fit}` : '',
				plan.summary.planType,
				plan.summary.usageCharge,
				plan.name,
				plan.providerName,
			].map((s) => s.trim().replace(' ', '').toLowerCase());

			let querySplit = searchQuery.value.split(' ').map((s) => s.trim().replace(' ', '').toLowerCase());

			return querySplit.every((query) => searchTerms.some((term) => term.includes(query)));
		});
		
		let limitedPlans = filteredPlans.slice(0, limit);

		setTimeout(() => {
			sCalc.popups();
		}, 100);
	
		return html`
			<link rel="stylesheet" href="/css/calc/dialogs/select_energy_plan.css?v5"/>
			<div class="plan-select">
				<h1>Select your Energy Plan</h1>
				<a class="close icon-add"></a>
				${Divider()}
			
				<label> Search for a plan </label>
				<br/>
				<div class="icon-search">
					<input class="search-input" type="text" onkeyup=${searchPlans} placeholder="Search..." />
				</div>
				<br/>

				${(limitedPlans).map(plan => {
					return html`
						<${PlanCard} plan=${plan} onPlanSelected=${onPlanSelected} selected=${selectedPlan == plan.offerId} />
					`;
				})}

				${limit < filteredPlans.length ? html`
					<div class="action-buttons center">
						<button style="color: var(--sapphire); margin-bottom: 10px;" onClick=${() => limit.value += 50}>Load More</button>	
					</div>
				` : ''}
				
				<div class="add-custom-plan">
					<b><p>Don't see your plan?</p></b>
					<p>Please add your tariffs below</p>
					<div class="action-buttons center">
						<a data-popup="create-plan">Add your tariffs here</a>
					</div>
				</div>
			</div>
		`;

	
	}

	function Divider(transparent = false) {
		return html`<div style="${transparent ? 'background: none;' : ''}" class="divider"></div>`;
	}

	class PlanCard extends Component {
		constructor(props) {
			super(props);

			let plan = props.plan;

			var typeInfo = plan.summary.planType.split(' + '), chargesInfo = '';
			let fit = (plan.summary.fit ?? '') != '' ? `FiT: ${plan.summary.fit}` : '';

			this.state = {
				typeInfo: typeInfo,
				charge: plan.summary.usageCharge.split(' | '),
				fit: fit,
			};
		}

		render(props, state) {
			const { plan, onPlanSelected } = this.props;

			return html`
				<div class="plan-card ${props.selected ? 'selected' : ''}" onClick=${() => onPlanSelected(plan)}>
					<${Tags} tags=${state.typeInfo} />
					<div class="plan-card-header">
						<h2>${plan.name} <span>- ${plan.providerName}</span></h2>
						<p>${plan.supplier}</p>
					</div>
					<div class="plan-charges">
						<div>
							${state.charge.map((charge) => html`
								<span>${charge}</span>
							`)}
						</div>
						<span>${state.fit}</span>
					</div>
				</div>
			`;
		}
	
	}

	window.renderSelectEnergyPlanPopup = ({
		container, plansList, onPlanPicked, selectedPlan
	}) => {
		
		render(html`
			<${SelectEnergyPlanPopup} 
				plansList=${plansList} 
				onPlanPicked=${onPlanPicked}
				selectedPlan=${selectedPlan}
			/>
		`, container);
	}
</script>	</head>
	<body class="simple-mode-open disable-persistent-rounded-form">
		<script src="/js/webp-detector.js?1599999900"></script><link rel="stylesheet" href="/css/sqheader.css?1748178202"/><link rel="stylesheet" href="/css/menu_2021.css?1645008867"/>
	<script src="/js/menu_2021.js?1697451730" defer="defer"></script>
<!-- The style below applies to all headers but Lead Manager and Supplier Manager, as they don't use this element-->
<style>	
	@media only screen and (max-width: 47.5em) {
		.sqheader #header .logo {						
			height: 30px;
		}
	}
	@media (max-width: 767px) and (orientation: portrait),
	(max-width: 812px) and (orientation: landscape){
		#header #search label{
			font-size: 16px;
			margin: 0px;
		}

		#search .link-btn a i, button i{
			margin: -16px -2px 0;
		}
	}
</style>

<span class='sqheader blue-header'>
	<div id='header_before'>
		<div id="header">
			<div class="wrap">
				<div class="header">
					<div class="shell clearfix">
						<div class="header-right">
							<div class="logo"><a href="/">Solar Quotes</a></div>
						</div>
						<div class="form-check form-check-rounded">
							<form action="https://www.solarquotes.com.au/quotesv2/" method="get" class="postcode-form">
								<div class="form-head mobile-hidden">
									<p>Ready to get up to 3 free quotes?</p>
									<div class="get-quote-bullets">
										<span>&#10003; Solar</span>
										<span>&#10003; EV Chargers</span>
										<span>&#10003; Batteries</span>
										<span>&#10003; Heat Pumps</span>
									</div>
								</div><!-- /.form-head -->
								<div class="go-form-top mobile-visible">
									<p>Get up to 3 free quotes for solar, batteries, EV chargers or hot water heat pumps</p>
								</div>

								<div class="form-body">
									<input type="number" class="field" placeholder="Enter Your Postcode" title="Enter Your Postcode" maxlength="4" pattern="\d*" name="postcode" autocomplete="off">
									<input type="submit" value="I'm ready" class="btn btn-orange mobile-hidden">
									<div class="go-header-submit go-submit mobile-visible">
										<p>GET MY QUOTES</p>
										<span>only takes 2 minutes</span> 
									</div>
								</div><!-- /.form-body -->
							</form>
						</div><!-- /.form-check -->
					</div><!-- /.shell -->
					<header id="navigation-header">
					    <input type="checkbox" id="search-show" autocomplete="off">
					    <input type="checkbox" id="responsive-menu" autocomplete="off">
					    <div class="logo-mobile" onClick="location.href = '/';"></div>
					    <div id="nav-actions">
					        <label for="responsive-menu" id="menu-label"></label>
					        <label for="search-show" id="search-label" class="search"></label>
					    </div>
					    <div id="mobile-search">
					        <form action="https://www.solarquotes.com.au/search/">
					            <div class="input-form">
					                <label for="addsearch">Search</label>
					                <div>
					                    <input type="text" id="addsearch" name="addsearch" placeholder="search...">
					                    <button type="submit" role="button" aria-label="Search" title="Search">
					                    <i class="sq-menu-search"></i>
					                    </button>
					                </div>
					            </div>
					        </form>
					    </div>
					    <nav id="menu">
					        <div class="wrap">
					            <div class="shell">
					                <ul id="menu-main-menu" class="menu genesis-nav-menu menu-primary nav">
					                    <li id="menu-item-1141" class="home menu-item menu-item-type-custom menu-item-object-custom menu-item-1141"><a href="https://www.solarquotes.com.au/?_ga=2.212394900.144796668.1642590640-2056889204.1584552348">home</a></li>
					                    <li id="menu-item-1142" class="red has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-1142">
					                        <a href="#">start here</a>
					                        <ul class="sub-menu">
					                            <li id="menu-item-24338" class="desktop-red menu-item menu-item-type-custom menu-item-object-custom menu-item-24338"><a href="https://www.solarquotes.com.au/solar101.html">New to Solar? Read this first</a></li>
					                            <li id="menu-item-24291" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24291">
					                                <a href="#">Solar/Battery Guides</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24292" class="menu-spacer menu-item menu-item-type-custom menu-item-object-custom menu-item-24292"><a href="/101-guides/">All "101" Guides</a></li>
					                                    <li id="menu-item-24293" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24293"><a href="/101-guides/understanding-solar/">Understanding Solar</a></li>
					                                    <li id="menu-item-24294" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24294"><a href="/solar101.html">Buying Solar</a></li>
					                                    <li id="menu-item-24295" class="menu-spacer menu-item menu-item-type-custom menu-item-object-custom menu-item-24295"><a href="/101-guides/owning-solar/">Owning Solar</a></li>
					                                    <li id="menu-item-24296" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24296"><a href="/101-guides/understanding-batteries/">Understanding Batteries</a></li>
					                                    <li id="menu-item-24297" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24297"><a href="/101-guides/buying-batteries/">Buying Batteries</a></li>
					                                    <li id="menu-item-24298" class="menu-spacer menu-item menu-item-type-custom menu-item-object-custom menu-item-24298"><a href="/101-guides/owning-batteries/">Owning Batteries</a></li>
					                                    <li id="menu-item-24299" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24299"><a href="/commercial-solar-guide.html">Commercial Solar</a></li>
					                                </ul>
					                            </li>
					                            <li id="menu-item-24300" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24300">
					                                <a href="#">Installers</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24301" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24301"><a href="/installers/">Installers Overview</a></li>
					                                    <li id="menu-item-24302" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24302"><a href="/installers/reviews/">Installer Reviews</a></li>
					                                    <li id="menu-item-24303" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24303"><a href="/solar-installer-ratings.html">Top Performers</a></li>
					                                    <li id="menu-item-24304" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24304"><a href="/supplier.php">Installers - Apply Now!</a></li>
					                                </ul>
					                            </li>
					                            <li id="menu-item-24315" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24315">
					                                <a href="#">Solar Panels</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24316" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24316"><a href="https://www.solarquotes.com.au/panels/">Choosing Solar Panels</a></li>
					                                    <li id="menu-item-24317" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24317"><a href="https://www.solarquotes.com.au/panels/reviews/">Panel Reviews</a></li>
					                                    <li id="menu-item-24318" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24318"><a href="https://www.solarquotes.com.au/panels/comparison/compare-solar-panels/">Compare Panels</a></li>
					                                    <li id="menu-item-24319" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24319"><a href="https://www.solarquotes.com.au/panels/cost/">Cost Of Solar</a></li>
					                                </ul>
					                            </li>
					                            <li id="menu-item-24320" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24320">
					                                <a href="#">Inverters</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24321" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24321"><a href="https://www.solarquotes.com.au/inverters/">Choosing An Inverter</a></li>
					                                    <li id="menu-item-24322" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24322"><a href="https://www.solarquotes.com.au/inverters/reviews/">Inverter Reviews</a></li>
					                                    <li id="menu-item-24323" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24323"><a href="https://www.solarquotes.com.au/inverters/#compare">Compare Inverters</a></li>
					                                    <li id="menu-item-24324" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24324"><a href="https://www.solarquotes.com.au/battery-storage/hybrid-inverter-comparison/">Compare Hybrid Inverters</a></li>
					                                    <li id="menu-item-24325" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24325"><a href="https://www.solarquotes.com.au/inverters/micro/">Microinverters</a></li>
					                                </ul>
					                            </li>
					                            <li id="menu-item-24326" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24326">
					                                <a href="#">Batteries</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24327" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24327"><a href="https://www.solarquotes.com.au/battery-storage/comparison-table/">Solar Battery Overview</a></li>
					                                    <li id="menu-item-24328" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24328"><a href="https://www.solarquotes.com.au/battery-storage/reviews/">Battery Reviews</a></li>
					                                    <li id="menu-item-24330" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24330"><a href="https://www.solarquotes.com.au/battery-storage/how-does-it-work/">How Batteries Work</a></li>
					                                    <li id="menu-item-24331" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24331"><a href="https://www.solarquotes.com.au/battery-storage/virtual-power-plants/">Virtual Power Plants</a></li>
					                                    <li id="menu-item-24332" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24332"><a href="https://www.solarquotes.com.au/battery-storage/vpp-comparison/">Compare VPPs</a></li>
					                                </ul>
					                            </li>
												<li id="menu-item-24339" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24339">
													<a href="#">EV Chargers</a>
													<ul class="sub-menu">
														<li id="menu-item-24340" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24340"><a href="/ev-chargers/">EV Chargers Overview</a></li>
														<li id="menu-item-24341" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24341"><a href="/ev-chargers/reviews/">EV Charger Reviews</a></li>
														<li id="menu-item-24342" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24342"><a href="/ev-chargers/installation/">EV Charger Installation</a></li>
														<li id="menu-item-24343" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24343"><a href="/electric-vehicles/v2l-v2g-v2h/">V2L, V2G, V2H Explained</a></li>
													</ul>
												</li>
												<li id="menu-item-24345" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24345">
													<a href="#">Hot Water Heat Pumps</a>
													<ul class="sub-menu">
														<li id="menu-item-24346" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24346"><a href="/hot-water/heat-pump/">Heat Pumps Overview</a></li>
														<li id="menu-item-24347" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24347"><a href="/hot-water/heat-pump/installation/">Heat Pump Installation</a></li>
														<li id="menu-item-24348" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24348"><a href="/hot-water/heat-pump/stc-calculator/">Heat Pump STC Calculator</a></li>
													</ul>
												</li>
					                            <li id="menu-item-24333" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24333">
					                                <a href="#">Upgrades/Repairs</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24361" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24361"><a href="/systems/upgrade/">System Upgrades</a></li>
					                                    <li id="menu-item-24362" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24362"><a href="/systems/repairs-maintenance/">Repairs/Maintenance</a></li>
					                                </ul>
					                            </li>
					                            <li id="menu-item-24335" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24335">
					                                <a href="#">Subsidies/Rebates</a>
					                                <ul class="sub-menu">
					                                    <li id="menu-item-24363" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24363"><a href="/rebates-subsidies/">All Subsidies</a></li>
					                                    <li id="menu-item-24337" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24337"><a href="https://www.solarquotes.com.au/panels/rebate/">Solar Rebate</a></li>
					                                    <li id="menu-item-24336" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24336"><a href="https://www.solarquotes.com.au/systems/feed-in-tariffs/">Feed In Tariffs</a></li>
														<li id="menu-item-24344" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24344"><a href="https://www.solarquotes.com.au/battery-storage/rebates/">Battery Rebates</a></li>
					                                </ul>
					                            </li>
					                        </ul>
					                    </li>
					                    <li id="menu-item-24305" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24305">
					                        <a href="#">Reviews</a>
					                        <ul class="sub-menu">
					                            <li id="menu-item-24306" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24306"><a href="/solar-reviews/">All Solar Reviews</a></li>
					                            <li id="menu-item-24307" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24307"><a href="/testimonials.html">SolarQuotes Testimonials</a></li>
					                        </ul>
					                    </li>
					                    <li id="menu-item-24308" class="has-dropdown menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-24308">
					                        <a href="#">Tools</a>
					                        <ul class="sub-menu">
					                            <li id="menu-item-24309" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24309"><a href="/tools/">All Solar Tools</a></li>
					                            <li id="menu-item-24312" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24312"><a href="/tools/stc_calculator/">Rebate &amp; STC Calculator</a></li>
					                            <li id="menu-item-24310" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24310"><a href="/solar-calculator/">Solar Power Calculator</a></li>
					                            <li id="menu-item-24311" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24311"><a href="/battery-storage/calculator/">Add Battery Calculator</a></li>
					                            <li id="menu-item-24360" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24360"><a href="/price-explorer/">Price Explorer</a></li>
					                            <li id="menu-item-24313" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24313"><a href="/energy/">Compare Feed-In Tariffs</a></li>
					                            <li id="menu-item-24314" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-24314"><a href="/location/">Solar in Your Location</a></li>
					                        </ul>
					                    </li>
					                    <li id="menu-item-1144" class="about menu-item menu-item-type-custom menu-item-object-custom menu-item-1144"><a href="https://www.solarquotes.com.au/about-us/">about</a></li>
					                    <li id="menu-item-1145" class="faq menu-item menu-item-type-custom menu-item-object-custom menu-item-1145"><a href="https://www.solarquotes.com.au/faq.html">FAQ</a></li>
					                    <li id="menu-item-1146" class="blog menu-item menu-item-type-custom menu-item-object-custom menu-item-1146"><a href="https://www.solarquotes.com.au/blog/">blog</a></li>
					                    <li id="menu-item-1147" class="contact menu-item menu-item-type-custom menu-item-object-custom menu-item-1147"><a href="https://www.solarquotes.com.au/contact/">contact</a></li>
					                </ul>
					            </div>
					        </div>
					        <label for="responsive-menu" id="menu-close"></label>
					    </nav>
					</header>
				</div>
			</div>
		</div>
	</div>
</span>		<div id="root" class="bcalc">
			<header id="top">
				<p id="logo"><a href="/" accesskey="h">Solarquotes.com.au</a></p>
			</header>
			<main id="content">
				<header class="module-heading">
					<div class="flash-error">
											</div>
					<h1>Battery Calculator</h1></br>
					<h2>Calculate savings when adding a battery to your existing solar panel system, including the federal battery rebate</h2>
					<p>Simply input your electricity tariff, the battery you are considering, and upload your smart meter data to get definitive battery savings and payback based on your real-life 12 month usage. This estimate includes the federal government's Cheaper Home Batteries Program subsidy, commonly referred to as the battery rebate.</p>
					<p class="large-screen-hide"><b>Please note:</b> You must have at least 12 months (365 days) of both grid usage and solar export data.
				</header>
				<article class="module-info">
					<header>
						<h2>How it works</h2>
					</header>
					<div>
						<p>
							By uploading your smart meter data we can see exactly how much spare solar you have throughout the year to charge a battery, and how much electricity you use after sundown.
							<br/><br/>
							We use this data to calculate exactly what your bill would have been for the previous 12 months if there was a battery charging from the solar during the day and powering your home at night.
							<br/><br/>
							Don't have solar yet, don't have at least 12 months of data, or can't access your smart meter data? Try our <a href="https://www.solarquotes.com.au/solar-calculator/" style="text-decoration: underline !important;">solar calculator</a>.
						</p>
					</div>
				</article>
				<div class="cols-a">
					<article>
												<form method="post" accept-charset="utf-8" class="form-calculator battery-calc" action="https://www.solarquotes.com.au/battery-storage/calculator/result/">
						<input type="hidden" name="calcversion" value="1.0.2"/>						<div class="module-panel" id="postcode-input">
							<header class='lh-postcode'>
								<h2>Why do we need your postcode?</h2>
								<p> Your postcode lets us a) use sensible default electricity rates and b) determine your network's peak, off-peak and shoulder time periods.</p>
							</header>
							<p class="input-inline" style="height: 100px; ">
								<label for="postcode" class="strong">Your postcode</label>
								<input type="tel" name="postcode" autocomplete="off" placeholder="3000" class="w280" required="required" maxlength="4" id="postcode" aria-required="true" aria-label="3000" value=""/>								<input type="hidden" name="lat" id="postcode-lat" value=""/>								<input type="hidden" name="lon" id="postcode-lon" value=""/>								<input type="hidden" name="state" id="postcode-state" value=""/>							</p>
							<span id='field-error-msg-postcode' class="field-error-msg">Please enter a valid postcode</span>							
						</div>

						<div class="module-panel section-total-capacity hidden">
							<p style="line-height: 35px; margin-bottom: 0;">
								<strong>Your total system size</strong>
								<br />
								<span id="total-capacity">0</span> kilowatts (kW) of panels
							</p>
							<p style="margin-top: 10px; padding-top: 10px;">This calculator does not model export limits yet. If your system is heavily export limited exported energy will be lower than calculated.</p>
						</div>

						<div class="module-panel">

							<header class='lh-postcode'>
								<h2>Your electricity rates</h2>
								<p>Choose 'Standard' or 'Time-Of-Use' tariff then edit rates to match what you currently pay (and earn) per kWh.</p>
							</header>

							<p>
								<label class="strong">Your Electricity Plan</label>
							</p>
							
							<div class="pseudo-dropdown">
    <div class="create-plan-dropdown disabled">
        <input type="text" name="custom-plan-display-name" autocomplete="off" class="plan-selection readonly" style="float: none;" placeholder="Select your retailer and plan type" required="required" id="custom-plan-display-name" aria-required="true" aria-label="Select your retailer and plan type" value=""/>    </div>
    <a data-popup="create-plan" style="display: none;"></a>
</div>

<a style="display: none;" class="select-plan-link" href="#" data-popup="select-plan"></a>
<input type="hidden" name="plan-changes" id="plan-changes" value=""/><input type="hidden" name="custom-plan" id="custom-plan" value=""/>
							<div id="energy-plan-discounts">
								<p>Discounts:<br><span>Select the discounts you have access to <i>(guaranteed discouts are always included and can't be unticked)</i></span></p>
								<div class="discount-list">

								</div>
							</div>
						</div>
						<div class="module-panel">
							<header class='lh-postcode'>
								<h2>Choose a battery</h2>
								<p>Choose the battery you fancy, or if undecided, select 'Generic 10 kWh'</p>
							</header>
							<p>
								<label for="battery-selection" class="strong">Battery</label>
							</p>
							<div class="sqDropdown battery-selection options-radio ">
    <input type="text" name="battery-selection" placeholder="Select" required="required" id="battery-selection" class="sqDropdownText" autocomplete="off" value=""/>    
    <input type="hidden" name="battery-selection-value" class="hiddenDropdownValue" value=""/>    <div class="options">
        <div class="icon-search"> 
        <input type="text" name="battery-selection_search" placeholder="Search Brand" value=""/>    </div>
        <ul>
        <li class="option" data-value="custom-battery" data-price="0" data-reserve="0" ><span></span>My battery isn't on this list</li><li class="option" data-value="100" data-price="7500" data-reserve="0.2" ><span></span>Generic 10kWh Lithium Battery</li><li class="option" data-value="1" data-price="5000" data-reserve="0.2" ><span></span>Generic 6kWh Lithium Battery</li><li class="option" data-value="31445" data-price="8650" data-reserve="0.2" ><span></span>Tesla Powerwall 3</li><li class="option" data-value="29368" data-price="5300" data-reserve="0.2" ><span></span>Alpha-ESS G3 10.1 kWh</li><li class="option" data-value="23359" data-price="2400" data-reserve="0.2" ><span></span>Alpha-ESS SMILE-B3-PLUS</li><li class="option" data-value="29364" data-price="4465" data-reserve="0.2" ><span></span>Alpha-ESS SMILE5 10.1 kWh</li><li class="option" data-value="29367" data-price="4983" data-reserve="0.2" ><span></span>Alpha-ESS SMILE5 13.3 kWh</li><li class="option" data-value="29371" data-price="8200" data-reserve="0.2" ><span></span>Alpha-ESS T10</li><li class="option" data-value="56299" data-price="6000" data-reserve="0.2" ><span></span>Anker SOLIX X1 10 kWh</li><li class="option" data-value="56300" data-price="8100" data-reserve="0.2" ><span></span>Anker SOLIX X1 15 kWh</li><li class="option" data-value="56301" data-price="10000" data-reserve="0.2" ><span></span>Anker SOLIX X1 20 kWh</li><li class="option" data-value="56302" data-price="12000" data-reserve="0.2" ><span></span>Anker SOLIX X1 25 kWh</li><li class="option" data-value="56304" data-price="14000" data-reserve="0.2" ><span></span>Anker SOLIX X1 30 kWh</li><li class="option" data-value="50945" data-price="9062" data-reserve="0.2" ><span></span>Bluetti EP760 9.9</li><li class="option" data-value="24324" data-price="6150" data-reserve="0.2" ><span></span>BYD Battery Box LVS 12 kWh</li><li class="option" data-value="24323" data-price="4484" data-reserve="0.2" ><span></span>BYD Battery Box LVS 8 kWh</li><li class="option" data-value="26740" data-price="5857" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 11.0</li><li class="option" data-value="26742" data-price="6046" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 13.8</li><li class="option" data-value="55105" data-price="7046" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 16.6</li><li class="option" data-value="55106" data-price="8046" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 19.3</li><li class="option" data-value="55107" data-price="9046" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 22.1</li><li class="option" data-value="26738" data-price="4768" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVM 8.3</li><li class="option" data-value="26734" data-price="7600" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVS 10.2</li><li class="option" data-value="26736" data-price="9276" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVS 12.8</li><li class="option" data-value="26732" data-price="5860" data-reserve="0.2" ><span></span>BYD Battery Box Premium HVS 7.7</li><li class="option" data-value="30421" data-price="6750" data-reserve="0.2" ><span></span>Enphase IQ Battery 5P</li><li class="option" data-value="50958" data-price="3150" data-reserve="0.2" ><span></span>ESY Sunhome HM6-05</li><li class="option" data-value="56352" data-price="3700" data-reserve="0.2" ><span></span>ESY Sunhome HM6-10</li><li class="option" data-value="56353" data-price="4200" data-reserve="0.2" ><span></span>ESY Sunhome HM6-15</li><li class="option" data-value="56354" data-price="4800" data-reserve="0.2" ><span></span>ESY Sunhome HM6-20</li><li class="option" data-value="56355" data-price="5300" data-reserve="0.2" ><span></span>ESY Sunhome HM6-25</li><li class="option" data-value="56356" data-price="5900" data-reserve="0.2" ><span></span>ESY Sunhome HM6-30</li><li class="option" data-value="56311" data-price="4300" data-reserve="0.2" ><span></span>Fox-ESS ECS 14.4 kWh</li><li class="option" data-value="56312" data-price="5100" data-reserve="0.2" ><span></span>Fox-ESS ECS 19.2 kWh</li><li class="option" data-value="56313" data-price="5700" data-reserve="0.2" ><span></span>Fox-ESS ECS 24 kWh</li><li class="option" data-value="56314" data-price="6300" data-reserve="0.2" ><span></span>Fox-ESS ECS 28.8 kWh</li><li class="option" data-value="56315" data-price="6900" data-reserve="0.2" ><span></span>Fox-ESS ECS 33.6 kWh</li><li class="option" data-value="56307" data-price="3600" data-reserve="0.2" ><span></span>Fox-ESS ECS 9.6 kWh</li><li class="option" data-value="55753" data-price="7550" data-reserve="0.2" ><span></span>FranklinWH aPower X-01-AU</li><li class="option" data-value="56589" data-price="5525" data-reserve="0.2" ><span></span>Fronius Reserva 12.6</li><li class="option" data-value="56595" data-price="6340" data-reserve="0.2" ><span></span>Fronius Reserva 15.8</li><li class="option" data-value="56597" data-price="12860" data-reserve="0.2" ><span></span>Fronius Reserva 31.6</li><li class="option" data-value="56599" data-price="19020" data-reserve="0.2" ><span></span>Fronius Reserva 47.4</li><li class="option" data-value="23325" data-price="1600" data-reserve="0.2" ><span></span>GenZ 48V 3kWh</li><li class="option" data-value="29457" data-price="3876" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 12.8</li><li class="option" data-value="56344" data-price="4500" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 16.0</li><li class="option" data-value="56345" data-price="5100" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 19.2</li><li class="option" data-value="56346" data-price="5700" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 22.4</li><li class="option" data-value="56347" data-price="6300" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 25.6</li><li class="option" data-value="56348" data-price="7000" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 28.8</li><li class="option" data-value="29456" data-price="3132" data-reserve="0.2" ><span></span>GoodWe Lynx Home F G2 Series 9.6</li><li class="option" data-value="29857" data-price="6000" data-reserve="0.2" ><span></span>Growatt Ark 10.2H</li><li class="option" data-value="23326" data-price="6000" data-reserve="0.2" ><span></span>Growatt Ark 10.2L-A1</li><li class="option" data-value="24360" data-price="6800" data-reserve="0.2" ><span></span>iStore Smart Battery (10 kWh)</li><li class="option" data-value="24362" data-price="9570" data-reserve="0.2" ><span></span>iStore Smart Battery (15 kWh)</li><li class="option" data-value="24356" data-price="4150" data-reserve="0.2" ><span></span>iStore Smart Battery (5 kWh)</li><li class="option" data-value="30254" data-price="6900" data-reserve="0.2" ><span></span>Jinko Solar SunTank 10.24 kWh</li><li class="option" data-value="30255" data-price="8200" data-reserve="0.2" ><span></span>Jinko Solar SunTank 12.8 kWh</li><li class="option" data-value="30250" data-price="5723" data-reserve="0.2" ><span></span>Jinko Solar SunTank 7.68 kWh</li><li class="option" data-value="50921" data-price="7713" data-reserve="0.2" ><span></span>LAVO Storage S2</li><li class="option" data-value="56322" data-price="4300" data-reserve="0.2" ><span></span>Neovolt 10 kWh</li><li class="option" data-value="56339" data-price="5000" data-reserve="0.2" ><span></span>Neovolt 20 kWh</li><li class="option" data-value="56340" data-price="5700" data-reserve="0.2" ><span></span>Neovolt 30 kWh</li><li class="option" data-value="56341" data-price="6300" data-reserve="0.2" ><span></span>Neovolt 40 kWh</li><li class="option" data-value="56342" data-price="7000" data-reserve="0.2" ><span></span>Neovolt 50 kWh</li><li class="option" data-value="23336" data-price="2460" data-reserve="0.2" ><span></span>PowerPlus Energy LiFe4833P</li><li class="option" data-value="51732" data-price="2850" data-reserve="0.2" ><span></span>PowerPlus Energy LiFe4838P</li><li class="option" data-value="29295" data-price="7600" data-reserve="0.2" ><span></span>Pylontech Force L2 10.65 kWh</li><li class="option" data-value="29285" data-price="5789" data-reserve="0.2" ><span></span>Pylontech Force L2 7.1 kWh</li><li class="option" data-value="26377" data-price="1000" data-reserve="0.2" ><span></span>Pylontech US3000C</li><li class="option" data-value="51861" data-price="1359" data-reserve="0.2" ><span></span>Pylontech US5000B</li><li class="option" data-value="51790" data-price="7068" data-reserve="0.2" ><span></span>SigenStor Single-Phase (10 kWh)</li><li class="option" data-value="51791" data-price="7210" data-reserve="0.2" ><span></span>SigenStor Single-Phase (13 kWh)</li><li class="option" data-value="51792" data-price="7200" data-reserve="0.2" ><span></span>SigenStor Single-Phase (16 kWh)</li><li class="option" data-value="54710" data-price="9378" data-reserve="0.2" ><span></span>SigenStor Single-Phase (24 kWh)</li><li class="option" data-value="54715" data-price="13200" data-reserve="0.2" ><span></span>SigenStor Single-Phase (32 kWh)</li><li class="option" data-value="56094" data-price="15800" data-reserve="0.2" ><span></span>SigenStor Single-Phase (40 kWh)</li><li class="option" data-value="56095" data-price="18400" data-reserve="0.2" ><span></span>SigenStor Single-Phase (48 kWh)</li><li class="option" data-value="51783" data-price="5000" data-reserve="0.2" ><span></span>SigenStor Single-Phase (8 kWh)</li><li class="option" data-value="51797" data-price="8500" data-reserve="0.2" ><span></span>SigenStor Three-Phase (10 kWh)</li><li class="option" data-value="51799" data-price="8700" data-reserve="0.2" ><span></span>SigenStor Three-Phase (13 kWh)</li><li class="option" data-value="54712" data-price="9500" data-reserve="0.2" ><span></span>SigenStor Three-Phase (16 kWh)</li><li class="option" data-value="54713" data-price="11578" data-reserve="0.2" ><span></span>SigenStor Three-Phase (24 kWh)</li><li class="option" data-value="54718" data-price="14200" data-reserve="0.2" ><span></span>SigenStor Three-Phase (32 kWh)</li><li class="option" data-value="56092" data-price="16800" data-reserve="0.2" ><span></span>SigenStor Three-Phase (40 kWh)</li><li class="option" data-value="56093" data-price="19400" data-reserve="0.2" ><span></span>SigenStor Three-Phase (48 kWh)</li><li class="option" data-value="51795" data-price="7500" data-reserve="0.2" ><span></span>SigenStor Three-Phase (8 kWh)</li><li class="option" data-value="29634" data-price="2600" data-reserve="0.2" ><span></span>SOFAR PowerAll (10 kWh)</li><li class="option" data-value="54928" data-price="3200" data-reserve="0.2" ><span></span>SOFAR PowerAll (15 kWh)</li><li class="option" data-value="27379" data-price="7800" data-reserve="0.2" ><span></span>SolarEdge Energy Bank</li><li class="option" data-value="23349" data-price="8200" data-reserve="0.2" ><span></span>sonnenBatterie Eco 9.53/10</li><li class="option" data-value="27401" data-price="8700" data-reserve="0.2" ><span></span>sonnenBatterie Evo</li><li class="option" data-value="50924" data-price="9400" data-reserve="0.2" ><span></span>Sungrow SBH200</li><li class="option" data-value="54814" data-price="10750" data-reserve="0.2" ><span></span>Sungrow SBH250</li><li class="option" data-value="56246" data-price="12100" data-reserve="0.2" ><span></span>Sungrow SBH300</li><li class="option" data-value="56247" data-price="13500" data-reserve="0.2" ><span></span>Sungrow SBH350</li><li class="option" data-value="56248" data-price="14900" data-reserve="0.2" ><span></span>Sungrow SBH400</li><li class="option" data-value="25287" data-price="5270" data-reserve="0.2" ><span></span>Sungrow SBR HV 12.8 kWh</li><li class="option" data-value="52588" data-price="6220" data-reserve="0.2" ><span></span>Sungrow SBR HV 16 kWh</li><li class="option" data-value="52590" data-price="7100" data-reserve="0.2" ><span></span>Sungrow SBR HV 19.2 kWh</li><li class="option" data-value="56243" data-price="8000" data-reserve="0.2" ><span></span>Sungrow SBR HV 22.4 kWh</li><li class="option" data-value="56245" data-price="8900" data-reserve="0.2" ><span></span>Sungrow SBR HV 25.6 kWh</li><li class="option" data-value="25282" data-price="4380" data-reserve="0.2" ><span></span>Sungrow SBR HV 9.6 kWh</li>                    </ul>
    </div>
</div>

<script src="/js/sqdropdown.js?1750159026"></script><link rel="stylesheet" href="/css/sqdropdown/sqdropdown.css?1750159026"/>							<div class="custom-battery-fields hidden">
								<div id="battery-capacity">
									<p id="capacity-p" class="input-inline" style="height: 100px">
										<label for="postcode" class="strong">Usable Battery Capacity</label>
										<input type="number" name="battery-capacity" autocomplete="off" class="w280" min="0" step="0.01" id="battery-capacity" value="10"/>										<span class="kwh-sign"> kWh </span>
									</p>
									<span class="custom-battery-fields-text">The amount of battery energy you can actually use — it’s less than the nominal (total) capacity.</span>
								</div>
								<div id="battery-efficiency">
									<p id="efficiency-p" class="input-inline" style="height: 100px">
										<label for="postcode" class="strong">Battery Efficiency</label>
										<input type="number" name="battery-efficiency" autocomplete="off" class="w280" min="0" step="0.01" id="battery-efficiency" value="90"/>										<span class="percent-sign"> % </span>
									</p>
									<span class="custom-battery-fields-text">This can vary, but 90% is a good rule of thumb.</span>
								</div>
							</div>
							<div id="battery-reserve" class="hidden ">
								<p id="reserve-p" class="input-inline" style="height: 100px">
									<label for="postcode" class="strong">Battery Reserve</label>
									<input type="number" name="battery-reserve" autocomplete="off" class="w280" required="required" min="0" step="0.01" id="battery-reserve" aria-required="true" value="20"/>									<span class="percent-sign"> % </span>
								</p>
								<span class="custom-battery-fields-text">Many batteries can reserve some energy exclusively for blackouts.</span>
							</div>
						</div>
						<div class="module-panel">
							<div class="double">
								<p>
									<label for="total_cost">
										<span class="prefix">$</span>
										<b>Battery Cost (installed)</b>
									</label>
									<input type="text" name="total_cost" autocomplete="off" inputmode="decimal" placeholder="000.00" class="w105 prefixed" id="total-cost" aria-label="000.00" value="6,600"/>									<span class="suffix">Price should be including <a target="_blank" href="https://www.solarquotes.com.au/battery-storage/installation/">battery installation</a></span>
								</p>
							</div>
						</div>
						<div class="module-panel nem12">
							<header class="lh-postcode">
								<h2>How do I get an NEM12 File?</h2>
								<p>If you have solar, you have a smart meter. If you have a smart meter, you can usually download its data from a web portal. <a target="_blank" href="https://support.solarquotes.com.au/hc/en-us/articles/360001312176-How-to-access-your-smart-meter-data-">Click here to see how to get your smart meter data.</a></p>
								<p style="font-weight: 500;">You'll get it as a .csv file. That's the file to upload here.</p>
							</header>	
							<div style="position: relative; ">
								<button id="uploadNem12"></button>
								<span id="file_label"></span>
								<span id='field-error-msg-uploadNem12' class="field-error-msg">Please upload a NEM12 file</span>
								<a class="mobile-only" href="#" data-popup="how-to-get-nem12">How do I get a NEM12 CSV File</a>
								<input type="hidden" name="token" id="token" value=""/>								<input type="hidden" name="nem12-file-name" id="nem12-file-name" value=""/>							</div>
						</div>
						<p class="submit">
							<button type="submit">Calculate Your Battery Savings & Payback <span> &#xe910; </span> </button>
						</p>
						</form>					</article>
					<aside>
						<div class="module-panel expanded">
							<h3>How To Use This Calculator</h3>
							<p>This calculator will only work if:</br><b>1</b>. You already have a solar system and are considering adding a battery.</br><b>2</b>. You have a smart meter and that smart meter is capable of producing interval-level data.</br><b>3</b>. You are willing to download this data from your electricity network provider (DNSP).</br><b>4</b>. You have at least 12 months (365 days) of both solar export and grid usage data.</p>
							<p>If we've got past all of that, all you need to do is:<br/><b>1</b>. Enter your postcode</br><b>2</b>. Choose your current electricity plan</br><b>3</b>. Select the battery you are considering buying</br><b>4</b>. Enter the cost of supply and installation of that battery (we'll guess in most cases).</br><b>5</b>. Upload the NEM12 CSV file you downloaded from your DNSP.</br><b>6</b>. Then calculate your savings.</p>
							<p>Once that's done, you'll see an estimate of your next four bills and estimated payback time.</p>
						</div>
						<div class="module-panel">
							<h3 style="font-weight: 700">Big Fat Disclaimer</h3>
							<p>This calculator is intended to provide illustrative examples based on stated assumptions and your inputs.</p>
							<p>Although we've tried hard to get all the calculations correct - there is a possibility that we've made a mistake somewhere - we are only human.</p>
							<p>Be aware that - although the default settings reflect sensible values, you should change them to reflect your reality.</p>
							<p>This calculator looks back in time - to your past 12 months usage - no one knows what retail electricity rates will be in the years ahead.</p>
							<p>This calculator is not intended to be solely relied on for the purposes of buying a battery. Talk to a good, honest installer too.</p>
							<p>Consider obtaining advice from an Australian Financial Services licensee before making any financial decision that involves mortgages, loans or solar financing.</p>
							<p>Actual outcomes will depend on a range of factors outside the control of SolarQuotes.</p>
						</div>					
					</aside>
				</div>
			</main>
			<article class="popup-a" data-title="how-to-get-nem12">
				<p>If you have a smart meter, it likely has 30-minute interval data that can help us figure out how a battery can change your electricity bills.</p>
				<p>You can get this data from your electricity network provider (DNSP). Check our <a target="_blank" href="https://support.solarquotes.com.au/hc/en-us/articles/360001312176-How-to-access-your-smart-meter-data-">support article</a> to see how to get it.</p>
				<p>Once you get the data in a CS file from your DNSP, upload it here. Our tool will then show you what to expect.</p>
				<p class="link-btn">
					<a class="close">Got it, thanks!</a>
				</p>
			</article>
			<article class="popup-a popup-calc" data-title="create-plan">
				<div id="planCreationContainer">
				</div>
			</article>
			<article class="popup-a popup-calc" data-title="select-plan">
				<div id="selectPlanContainer">
				</div>
			</article>
			<style>
    .grecaptcha-badge { visibility: hidden; }
</style>
<script>
    var recaptchakey = '6LfAXbkZAAAAANDa6SF4HPwlojsUGqwT3pD47aYC';

    function updateRecaptchaToken(callback) {
        var $ = jQuery;
        grecaptcha.ready(function () {
            grecaptcha.execute(recaptchakey, {action: 'submit'}).then(function (token) {
                $('#g-recaptcha-response').val(token);
                callback();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var $ = jQuery;
        $('.calc-help-popup form').each(function () {
            var form = $(this);
            var submitButton = form.find('input[type="submit"]');
            var originalButtonText = submitButton.val();

            form.on('submit', function (e) {
                if (form.data('is-submitting')) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                form.data('is-submitting', true);

                if (submitButton.length) {
                    submitButton.prop('disabled', true);
                    if (originalButtonText) {
                        submitButton.val('Sending...');
                    }
                }

                updateRecaptchaToken(function () {
                    form[0].submit();
                });
            });
        });
    });

</script>
<script src="https://www.google.com/recaptcha/api.js?render=6LfAXbkZAAAAANDa6SF4HPwlojsUGqwT3pD47aYC"></script>

<article class="popup-a calc-help-popup" data-title="cant-upload-file">
    <center><h3>Can't upload your file? Let us help!</h3></center>
    <p>Your details will only be used to contact you about your file.</p>
        <form method="post" action="https://www.solarquotes.com.au/battery-storage/calculator/calc-help/">
        <input type="hidden" name="g-recaptcha-response" id="g-recaptcha-response">
        <input type="hidden" name="help-type" value="cant-upload-file">
        <input type="text" name="name" placeholder="Your Name*" required>
        <input type="email" name="email" placeholder="Your Email*" required>
        <input type="phone" maxlength="4"  name="plan-postcode" placeholder="Your Postcode*" required>
                    <input type="text" maxlength="100" value="" name="plan" placeholder="Your retailer and plan name*" required>
                            <label>Uploaded File: </label>
            <input type="text" readonly name="file_name" value="">
            <input type="hidden" name="file_token" value="">
            <br>
                        <textarea  maxlength="200" name="message" placeholder="Any other comments? "></textarea>
        <input type="submit" value="Send Details">
    </form>
    <div class="close-container"><a class="close">Cancel</a></div>
    <div class="recaptcha-terms">
        This site is protected by reCAPTCHA and the Google
        <a href="https://policies.google.com/privacy" target="_blank">Privacy Policy</a> and
        <a href="https://policies.google.com/terms">Terms of Service</a> apply.
    </div>
</article>		</div>	
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
		<script>window.jQuery || document.write('<script src="/js/jquery.min.js"><\/script>');</script>
		
	<script src="/js/jquery.uploadifive.min.js?1592744190" defer="defer"></script>
	<script src="/js/calc/scripts.js?1642331642" defer="defer"></script>
	<script src="/js/calc/shared_calc.js?1753358776" defer="defer"></script>
	<script src="/js/calc/tooltip.js?1753358776" defer="defer"></script>
	<script src="/js/calc/battery_calc.js?1751458037" defer="defer"></script>
	<script src="/js/calc/electricity_plan_selection.js?1750159026" defer="defer"></script>
		<link rel="stylesheet" href="/css/sq-footer.css?1748178202"/><script type="text/javascript">
    function msieversion() {
        window.$ = jQuery;
        return 2;
    }
</script>

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-NZ97KQ');</script>
    <!-- End Google Tag Manager -->

<div id="footer_before-v2">
    <div class="footer-v2">
        <footer id="footer-v2">
            <div id="footer-top">
                <div id="footer-links">
                    <div class="footer-v2-col">
                        <div class="footer-title"><a href="https://www.solarquotes.com.au/installers/cities/">Popular Locations</a></div>
                        <ul>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/sydney/">Sydney</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/newcastle/">Newcastle</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/wollongong/">Wollongong</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/brisbane/">Brisbane</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/goldcoast/">Gold Coast</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/sunshinecoast/">Sunshine Coast</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/cairns/">Cairns</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/melbourne/">Melbourne</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/geelong/">Geelong</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/bendigo/">Bendigo</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/adelaide/">Adelaide</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/perth/">Perth</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/hobart/">Hobart</a></li>
                            <li><a href="https://www.solarquotes.com.au/installers/cities/darwin/">Darwin</a></li>
                        </ul>
                    </div>

                    <div class="footer-v2-col footer-v2-col-stacked">
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/panels/">Solar Panels</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/solar-reviews/#section-panels">Top 5 Solar Panel Brands</a></li>
                                <li><a href="https://www.solarquotes.com.au/panels/comparison/compare-solar-panels/">Solar Panel Comparison Table</a></li>
                                <li><a href="https://www.solarquotes.com.au/panels/rebate/">Solar Panel Rebate</a></li>
                                <li><a href="https://www.solarquotes.com.au/panels/cost/">Cost Of Solar Panels</a></li>
                            </ul>
                        </div>
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/battery-storage/comparison-table/">Solar Batteries</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/solar-reviews/#section-batteries">Top 5 Battery Brands</a></li>
                                <li><a href="https://www.solarquotes.com.au/battery-storage/cost/">Battery Costs</a></li>
                                <li><a href="https://www.solarquotes.com.au/battery-storage/rebates/">Battery Rebates</a></li>
                                <li><a href="https://www.solarquotes.com.au/battery-storage/vpp-comparison/">VPP Comparison Table</a></li>
                            </ul>
                        </div>
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/installers/">Solar Installers</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/installers/reviews/">Solar Installers A-Z</a></li>
                                <li><a href="https://www.solarquotes.com.au/solar-installer-ratings.html">Top Rated Installers</a></li>
                                <li><a href="https://www.solarquotes.com.au/installation-guarantee/">Good Installer Guarantee</a></li>
                            </ul>
                        </div>
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/inverters/">Solar Inverters</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/solar-reviews/#section-inverters">Top 5 Inverter Brands</a></li>
                                <li><a href="https://www.solarquotes.com.au/inverters/#compare">Inverter Comparison Table</a></li>
                                <li><a href="https://www.solarquotes.com.au/battery-storage/hybrid-inverter-comparison/">Hybrid Inverter Comparison</a></li>
                                <li><a href="https://www.solarquotes.com.au/inverters/micro/">Microinverters</a></li>
                            </ul><p></p>
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/hot-water/heat-pump/">Hot Water Heat Pumps</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/solar-reviews/#section-heatpumps">Top 5 Heat Pump Brands</a></li>
                                <li><a href="https://www.solarquotes.com.au/hot-water/heat-pump/installation/">Heat Pump Installation</a></li>
                                <li><a href="https://www.solarquotes.com.au/hot-water/heat-pump/stc-calculator/">Heat Pump STC Calculator</a></li>
                            </ul>
                        </div>
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/ev-chargers/">EV Chargers</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/solar-reviews/#section-evchargers">Top 5 EV Charger Brands</a></li>
                                <li><a href="https://www.solarquotes.com.au/ev-chargers/#compare">Compare EV Chargers</a></li>
                                <li><a href="https://www.solarquotes.com.au/ev-chargers/installation/">EV Charger Installation</a></li>
                                <li><a href="https://www.solarquotes.com.au/electric-vehicles/v2l-v2g-v2h/">V2L, V2G, V2H Explained</a></li>
                            </ul>
                        </div>
                        <div class="footer-v2-col">
                            <div class="footer-title"><a href="https://www.solarquotes.com.au/tools/">Tools</a></div>
                            <ul>
                                <li><a href="https://www.solarquotes.com.au/tools/stc_calculator/">Rebate &amp; STC Calculator</a></li>
                                <li><a href="https://www.solarquotes.com.au/solar-calculator/">Solar Calculator</a></li>
                                <li><a href="https://www.solarquotes.com.au/battery-storage/calculator/">Battery Calculator</a></li>
                                <li><a href="https://www.solarquotes.com.au/energy/">Compare Feed-In Tariffs And Electricity Plans</a></li>
                                <li><a href="https://www.solarquotes.com.au/price-explorer/">Real-Time Solar Prices</a></li>
                                <li><a href="https://www.solarquotes.com.au/location/">Solar in Your Location</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="form-check">
                    <form action="https://www.solarquotes.com.au/quotesv2/" method="get" class="postcode-form">
                        <div class="form-row">
                            <div class="form-head mobile-hidden">
                                <p>Ready to get up to 3 free quotes?</p>
                                <div class="get-quote-bullets">
                                    <span>&#10003; Solar</span>
                                    <span>&#10003; EV Chargers</span>
                                    <span>&#10003; Batteries</span>
                                    <span>&#10003; Heat Pumps</span>
                                </div>
                            </div>
                            <div class="go-form-top mobile-visible">
                                <p>Get up to 3 free quotes for solar, batteries, EV chargers or hot water heat pumps</p>
                            </div>
                            <div class="form-controls">
                                <input type="text" id="dpostcode" class="field dpostcode" placeholder="Enter Your Postcode" title="Enter Your Postcode" tabindex="-1" maxlength="4" pattern="\d*" name="postcode" autocomplete="off" />
                                <input type="submit" value="I'm ready" class="btn btn-orange mobile-hidden">
                                <button type="submit" class="go-footer-submit go-submit quote-btn-mobile mobile-visible"><p>GET MY QUOTES</p><span>only takes 2 minutes</span></button>
                            </div>
                        </div>
                    </form>
                    <div class="badge">
                        <a href="/installation-guarantee/"><img src="/img/2020_quote/solar-quotes-guarantee.svg" alt="SolarQuotes Good Installer Guarantee"></a>
                    </div>
                </div>
            </div>
            <div id="footer-socials">
                <div class="footerv2-col" style="">
                    <div class="footerv2-cols footer-v2-col-stacked" style="">
                        <div class="footerv2-col">
                            <div class="form-search">
                                <form action="/search/">
                                    <input type="text" class="field field-search" placeholder="Search..." title="Search..." id="cse-search-input-box-id" name="addsearch">
                                    <input type="submit" value="GO" name="search" class="btn btn-blue">
                                </form>
                            </div>
                        </div>
                        <div class="footerv2-col">
                            <div class="socials" style="">
                                <a href="//www.facebook.com/solarquotes" class="icon-facebook">facebook</a>
                                <a href="//www.instagram.com/solarquotes" class="icon-instagram">instagram</a>
                                <a href="//www.twitter.com/solar_quotes" class="icon-twitter">twitter</a>
                                <a href="//youtube.com/solarquotesaustralia" class="icon-youtube">youtube</a>
                                <a href="//www.tiktok.com/@solar_quotes" class="icon-tiktok">tiktok</a>
                                <a href="//au.linkedin.com/company/solarquotes" class="icon-linkedin">linkedin</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="footer-ratings-container">
                <div id="footer-ratings">
                    <script async src="/js/sq-footer.js"></script>
                    <div class="review-tagline footer-title">Our customers trust us. <span class="mobile-break"></span>Over 20,000+ Australian reviews across 4 platforms:</div>
                    <div id="reviewsio-stats" class="footerv2-cols">
                        <div id="trustpilot-head" class="footerv2-col">
                            <a href="https://au.trustpilot.com/review/solarquotes.com.au">
                                <p id="trustpilot-stars" class="rating-a" data-val="4.6" data-of="5"> </p>
                                <span id="trustpilot-value">4.6</span>
                                <div class="review-count">Based on <span id="trustpilot">11,034</span> ratings</div>
                                <div id="trustpilot-name">TRUSTPILOT</div>
                            </a>
                        </div>
                        <div class="review-spacer"></div>
                        <div id="reviewio-head" class="footerv2-col">
                            <a href="https://www.reviews.io/company-reviews/store/www.solarquotes.com.au" class="footerv2-col">
                                <p id="reviewio-stars" class="rating-a" data-val="" data-of="5"> </p>
                                <span id="reviewio-value"></span>
                                <div class="review-count">Based on <span id="reviewio">400</span> ratings</div>
                                <div id="reviewio-name">REVIEWS.IO</div>
                            </a>
                        </div>
                        <div class="review-spacer"></div>
                        <div id="glocal-head" class="footerv2-col">
                            <a href="https://www.google.com/maps/place/SolarQuotes/@-26.4420923,136.0132789,4z/data=!4m2!3m1!1s0x6ab0da2d0599971b:0x9d78ba81e61d022d">
                                <p id="glocal-stars" class="rating-a" data-val="" data-of="5"> </p>
                                <span id="glocal-value"></span>
                                <div class="review-count">Based on <span id="google">400</span> ratings</div>
                                <div id="glocal-name">GOOGLE</div>
                            </a>
                        </div>
                        <div class="review-spacer"></div>
                        <div id="facebook-head" class="footerv2-col">
                            <a href="https://www.facebook.com/SolarQuotes/reviews/">
                                <p id="facebook-stars" class="rating-a" data-val="" data-of="5"> </p>
                                <span id="facebook-value"></span>
                                <div class="review-count">Based on <span id="fb">400</span> ratings</div>
                                <div id="facebook-name">FACEBOOK</div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div id="footer-bottom">
                <div class="sqlogo"></div>
                <p class="copyrights">&copy; 2009 to 2025 SolarQuotes Home Electrification Pty Ltd</p>
                <ul>
                    <li><a href="https://www.solarquotes.com.au/supplier/login.php" rel="nofollow">Login</a></li>
                    <li><a href="https://www.solarquotes.com.au/media.html">Media</a></li>
                    <!-- <li><a href="https://www.solarquotes.com.au/contact/">Contact</a></li> -->
                    <li><a href="https://www.solarquotes.com.au/privacy.html">Privacy Policy</a></li>
                    <li><a href="https://www.solarquotes.com.au/terms-of-use.html">Terms Of Use</a></li>
                    <li><a href="https://www.solarquotes.com.au/collection-statement.html">Collection Statement</a></li>
                </ul>
				            </div>
            <style>
                .sqlogo {
                    background: var(--sqlogo) no-repeat;
                    width: 150px;
                    height: 40px;
                }
            </style>
        </footer>
    </div>
</div>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
<script>window.jQuery || document.write('<script src="/js/jquery.min.js"><\/script>');</script>
<script async src="/js/sq-footer.js"></script>
	</body>
</html>

```html```