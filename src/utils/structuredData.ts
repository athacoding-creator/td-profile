/**
 * Utility functions to generate structured data (JSON-LD) for SEO
 */

interface EventData {
  id: string;
  title: string;
  description?: string;
  venue: string;
  city?: string;
  starts_at: string;
  ends_at?: string;
  poster_url?: string;
  price?: number;
  min_infaq?: number;
  max_infaq?: number;
  registration_type?: string;
  is_online?: boolean;
  youtube_url?: string;
  speaker?: string;
}

/**
 * Generate Event schema.org structured data
 * Helps Google understand event details for rich snippets
 */
export const generateEventSchema = (event: EventData, baseUrl: string = 'https://terasdakwah.com') => {
  const eventUrl = `${baseUrl}/event/${event.id}`;
  
  // Determine pricing and availability
  let offers = [];
  
  if (event.registration_type === 'free') {
    offers.push({
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'IDR',
      'availability': 'https://schema.org/InStock',
      'url': eventUrl,
    });
  } else if (event.registration_type === 'paid' && event.price) {
    offers.push({
      '@type': 'Offer',
      'price': event.price.toString(),
      'priceCurrency': 'IDR',
      'availability': 'https://schema.org/InStock',
      'url': eventUrl,
    });
  } else if (event.registration_type === 'infaq') {
    offers.push({
      '@type': 'Offer',
      'price': event.min_infaq?.toString() || '0',
      'priceCurrency': 'IDR',
      'availability': 'https://schema.org/InStock',
      'url': eventUrl,
      'description': `Infaq sukarela Rp ${event.min_infaq?.toLocaleString('id-ID') || '0'} - Rp ${event.max_infaq?.toLocaleString('id-ID') || '0'}`,
    });
  }

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': event.title,
    'description': event.description || event.title,
    'url': eventUrl,
    'startDate': event.starts_at,
    'endDate': event.ends_at || event.starts_at,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': event.is_online 
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    'organizer': {
      '@type': 'Organization',
      'name': 'Teras Dakwah',
      'url': baseUrl,
      'logo': 'https://res.cloudinary.com/dfjvcvbsn/image/upload/v1768960205/TD_Logo_anxcwb.png',
    },
    'offers': offers,
  };

  // Add location for offline events
  if (!event.is_online) {
    schema.location = {
      '@type': 'Place',
      'name': event.venue,
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': event.city || 'Indonesia',
        'addressCountry': 'ID',
      },
    };
  }

  // Add image if available
  if (event.poster_url) {
    schema.image = event.poster_url;
  }

  // Add performer/speaker if available
  if (event.speaker) {
    schema.performer = {
      '@type': 'Person',
      'name': event.speaker,
    };
  }

  return schema;
};

/**
 * Generate Organization schema for homepage
 */
export const generateOrganizationSchema = (baseUrl: string = 'https://terasdakwah.com') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Teras Dakwah',
    'url': baseUrl,
    'logo': 'https://res.cloudinary.com/dfjvcvbsn/image/upload/v1768960205/TD_Logo_anxcwb.png',
    'description': 'Platform tiket Teras Dakwah. Temukan kajian, talkshow, dan event Islami terbaru di kota terdekatmu.',
    'sameAs': [
      'https://www.instagram.com/terasdakwah',
      'https://www.twitter.com/TerasDakwah',
      'https://www.youtube.com/@TerasDakwah',
    ],
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'Customer Service',
      'availableLanguage': ['id', 'en'],
    },
  };
};

/**
 * Generate WebSite schema with search action
 */
export const generateWebsiteSchema = (baseUrl: string = 'https://terasdakwah.com') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Teras Dakwah',
    'url': baseUrl,
    'description': 'Platform tiket Teras Dakwah untuk kajian dan event Islami',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${baseUrl}/event?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
};

/**
 * Generate BreadcrumbList schema for navigation
 */
export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url,
    })),
  };
};
