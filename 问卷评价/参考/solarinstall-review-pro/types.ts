export interface ComponentReview {
  brand: string;
  customBrand: string;
  rating: number;
  review: string;
  isTooEarly: boolean;
}

export interface ReviewFormState {
  // Installer Info
  installerName: string;

  // Experience Ratings
  ratings: {
    costEffectiveness: number;
    performance: number;
    installation: number;
    clientSupport: number;
  };

  // Text Review
  reviewDescription: string;
  reviewImages: File[];
  installerResponseTime: string;

  // System Info
  isQuoteOnly: boolean;
  installationDate: string;
  systemSize: string;
  systemCost: string;

  // Component Reviews
  components: {
    inverter: ComponentReview;
    panel: ComponentReview;
    battery: ComponentReview;
    evCharger: ComponentReview;
    heatPump: ComponentReview;
  };
  proofOfPurchase: File[];

  // Customer Info
  customer: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    postCode: string;
  };
}

export type ComponentType = 'inverter' | 'panel' | 'battery' | 'evCharger' | 'heatPump';

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  inverter: 'Inverter',
  panel: 'Solar Panels',
  battery: 'Battery Storage',
  evCharger: 'EV Charger',
  heatPump: 'Hot Water Heat Pump',
};