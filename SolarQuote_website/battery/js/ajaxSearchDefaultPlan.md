https://www.solarquotes.com.au/battery-storage/calculator/ajaxSearchRetailers/
{
  "retailers": [
    "1st Energy",
    "AGL",
    "Alinta Energy",
    "Amber Electric",
    "Arcline by RACV - Energy",
    "Blue NRG Pty Ltd",
    "CovaU",
    "Diamond Energy Pty Ltd",
    "Dodo Power & Gas",
    "ENGIE",
    "Energy Locals",
    "EnergyAustralia",
    "Flow Power",
    "GloBird Energy",
    "Indigo Power",
    "Kogan Energy",
    "Lumo Energy",
    "Momentum Energy",
    "Nectr",
    "Next Business Energy Pty Ltd",
    "OVO Energy",
    "Origin Energy",
    "Pacific Blue Retail",
    "Powershop Australia",
    "Red Energy",
    "Sumo",
    "Tango Energy"
  ]
}

https://www.solarquotes.com.au/battery-storage/calculator/ajaxSearchDefaultPlan/

{
  "ratesStructure": {
    "rateType": "TimeOfUse",
    "rates": [
      {
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "structure": {
          "WeekDays": [
            {
              "startTime": 1500,
              "endTime": 2100,
              "tariff": 0
            },
            {
              "startTime": 2100,
              "endTime": 0,
              "tariff": 1
            },
            {
              "startTime": 0,
              "endTime": 1500,
              "tariff": 1
            }
          ],
          "Saturday": [
            {
              "startTime": 1500,
              "endTime": 2100,
              "tariff": 0
            },
            {
              "startTime": 2100,
              "endTime": 0,
              "tariff": 1
            },
            {
              "startTime": 0,
              "endTime": 1500,
              "tariff": 1
            }
          ],
          "Sunday": [
            {
              "startTime": 1500,
              "endTime": 2100,
              "tariff": 0
            },
            {
              "startTime": 2100,
              "endTime": 0,
              "tariff": 1
            },
            {
              "startTime": 0,
              "endTime": 1500,
              "tariff": 1
            }
          ]
        },
        "tariffs": [
          {
            "rates": [
              {
                "volume": 0,
                "rate": 0.2882
              }
            ],
            "blockPeriod": "P1D",
            "name": "Peak",
            "identifier": "Peak"
          },
          {
            "rates": [
              {
                "volume": 0,
                "rate": 0.1745
              }
            ],
            "blockPeriod": "P1D",
            "name": "Off-Peak",
            "identifier": "Off Peak"
          }
        ]
      }
    ],
    "dailySupplyChargeGST": null,
    "demandChargeGST": null,
    "dailyChargeStructureGST": [
      {
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "dailySupplyCharge": 1.0738200000000002,
        "demandCharge": null
      }
    ],
    "FiT": 3.3,
    "controlledLoadRates": null,
    "discountPercentage": 0,
    "planIdentifier": null
  },
  "energyPlan": {
    "offerId": "AGD568660MR",
    "last_update": "2024-11-13",
    "name": "Residential Solar Savers",
    "filePlan": false,
    "usageCharge": {
      "type": "timeOfUse",
      "data": [
        {
          "name": "All Year",
          "endDate": "2024-12-31",
          "touBlock": [
            {
              "name": "Peak",
              "blockRate": [
                {
                  "volume": 0,
                  "unitPrice": 28.82
                }
              ],
              "timeOfUse": [
                {
                  "days": "Business Days|Saturday|Sunday",
                  "endTime": "2100",
                  "startTime": "1500"
                }
              ],
              "description": ""
            },
            {
              "name": "Off-Peak",
              "blockRate": [
                {
                  "volume": 0,
                  "unitPrice": 17.45
                }
              ],
              "timeOfUse": [
                {
                  "days": "Business Days|Saturday|Sunday",
                  "endTime": "0000",
                  "startTime": "2100"
                },
                {
                  "days": "Business Days|Saturday|Sunday",
                  "endTime": "1500",
                  "startTime": "0000"
                }
              ],
              "description": ""
            }
          ],
          "startDate": "2024-01-01",
          "blockPeriod": "P1D",
          "dailySupplyCharge": 97.62
        }
      ]
    },
    "supplyCharge": 97.62,
    "demandCharge": null,
    "fit": 3.3,
    "solarFit": "Solar feed-in-tariff from 3.3 cents/kWh",
    "totalMaximumDiscount": 0,
    "totalUnrestrictedDiscount": 0,
    "providerId": 2,
    "providerName": "AGL",
    "providerGreenpeace": [
      {
        "company": "AGL Energy",
        "company_aliases": "AGL Power,AGL",
        "display_ranking": 48,
        "rating_out_of_10": "1.2",
        "star_rating_conversion": 1,
        "background": "AGL is Australia's largest generator and retailer of energy and electricity. They are also Australia's biggest climate polluter, accounting for about 8% of Australia's greenhouse gas emissions. While AGL owns and invests in renewable assets, 83% of AGL's generation comes from burning coal. They operate in NSW, QLD, VIC, SA and ACT.",
        "providing_clean_renewable_energy": "0%",
        "ending_dirty_coal_use_by_2030": "0%",
        "halting_fossil_fuel_expansion": "0%",
        "support_for_new_renewable_energy": "80%",
        "transparency_in_marketing": "0%",
        "pollution_and_environmental_harm": "0%"
      }
    ],
    "feeDetails": "Fee may be charged when reconnecting or reading your meter when you move into a property or change retailer. Includes GST. Fees may vary.: $47.00</br>Fee may be charged when disconnecting or reading your meter when you move out of a property or change retailer. Includes GST. Fees may vary.: $47.71</br>The amount is GST inclusive and applies to card payments made at Australia Post outlets: 0.49%</br>The amount is GST inclusive and applies to payments made by Visa debit cards.: 0.14%</br>The amount is GST inclusive and applies to payments made by Visa credit cards.: 0.65%</br>The amount is GST inclusive and applies to payments made by Mastercard credit cards.: 0.78%</br>The amount is GST inclusive and applies to payments made by Mastercard debit cards.: 0.3%</br>A paper bill fee may apply for each bill sent by post. Includes GST: $1.75</br>An over the counter payment fee may apply for payments made in-person at a Post Office. Includes GST: $3.20",
    "contractDetails": "Offer includes variable rates, Solar feed-in tariffs, retail fees & charges, which can change any time with notice to you. If we vary your rates, we’ll give you at least 5 business days prior notice of the variation. Other charges may vary with notice\nYour market contract is ongoing. From time to time, AGL reviews its offers and this offer will be reviewed with consideration to AGL’s generally available market offers",
    "discountDetails": "",
    "availablePercentageDiscounts": [],
    "availableAmountDiscounts": [],
    "unrestrictedDiscountDetails": "",
    "distributorName": [
      "Citipower"
    ],
    "offers": {
      "Citipower": {
        "offerId": "AGD568660MR",
        "solarFitDetails": [
          {
            "label": "Current FIT policy - AGL Retailer Feed-in Tariff (RFiT)",
            "rate": "3.3 c/kWh"
          }
        ]
      }
    },
    "solarFitDetails": [
      {
        "label": "Current FIT policy - AGL Retailer Feed-in Tariff (RFiT)",
        "rate": "3.3 c/kWh"
      }
    ],
    "planEligibility": "Only available to customers with a solar system with a total inverter capacity of 10kW or less who are not receiving a feed-in tariff under a government scheme. Further eligibility conditions apply, see www.agl.com.au/vicsolarterms for details",
    "subPlan": "Time of Use tariff",
    "annualMembership": 0,
    "effectiveDate": null,
    "directLink": null,
    "pricingModel": "TOU",
    "controlledLoad": [],
    "summary": []
  }
}
