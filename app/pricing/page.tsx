import type { Metadata } from 'next';

import { PricingScreen } from './pricing-screen';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'The platform is free — you pay creators a flat fee per post, set by them and visible before you book. Includes the transacted price index by audience size.',
};

export default function PricingPage() {
  return <PricingScreen />;
}
