# SEO Implementation Guide for Teras Dakwah

## Overview
This document outlines the comprehensive SEO optimizations implemented for the Teras Dakwah website to improve visibility in Google Search and other search engines.

---

## 1. Technical SEO Improvements

### 1.1 Meta Tags and Head Optimization
- **Title Tags**: Optimized with primary keyword "Teras Dakwah — Tiket Kajian & Event Islami"
- **Meta Descriptions**: Compelling 160-character descriptions for each page
- **Keywords**: Targeted keywords including "kajian islam", "event islami", "talkshow islam", "tiket event", "dakwah"
- **Viewport Meta Tag**: Ensures mobile responsiveness
- **Character Set**: UTF-8 encoding for proper text rendering

### 1.2 Open Graph & Social Media Tags
- **OG:title, OG:description, OG:image**: Optimized for social media sharing
- **Twitter Card Tags**: Enables rich Twitter previews
- **og:type**: Set to "website" for homepage, "event" for event pages
- **og:url**: Canonical URLs for proper indexing

### 1.3 Structured Data (JSON-LD)
Implemented schema.org structured data for:
- **Organization Schema**: Identifies Teras Dakwah as the organization
- **Website Schema**: Enables Google Search features like site search
- **Event Schema**: Rich event details including:
  - Event name, description, date/time
  - Location (venue, city)
  - Pricing information (free, paid, infaq)
  - Organizer details
  - Event images
  - Speaker/performer information
- **BreadcrumbList Schema**: Navigation hierarchy for better crawling

### 1.4 Robots.txt Optimization
**File**: `/public/robots.txt`
- Allows search engines to crawl public pages
- Blocks private user pages (admin, profil, poin, riwayat)
- Blocks payment and checkout pages
- Specifies crawl delay (1 second)
- References sitemap location

### 1.5 Sitemap
**File**: `/public/sitemap.xml`
- Lists all major public pages
- Includes change frequency and priority
- Updated with lastmod dates
- Helps Google discover and index pages efficiently

---

## 2. On-Page SEO

### 2.1 Page-Specific Optimization

#### Homepage (`/`)
- Primary keyword focus: "Teras Dakwah event platform"
- Displays latest events with rich snippets
- Organization and Website schema for enhanced SERP features

#### Events Listing (`/event`)
- Keyword focus: "Kajian islam", "Event islami", "Talkshow islam"
- Displays event cards with images and descriptions
- Optimized for search queries about Islamic events

#### Event Detail Pages (`/event/:id`)
- Dynamic SEO with event-specific information
- Event schema markup with:
  - Event title and description
  - Date, time, and location
  - Pricing details
  - Speaker information
  - Event image/poster
- Canonical URLs to prevent duplicate content

### 2.2 Content Optimization
- **Headings**: Proper H1, H2, H3 hierarchy
- **Images**: Alt text on all images for accessibility and SEO
- **Internal Links**: Links between related events and pages
- **Mobile Optimization**: Responsive design for all devices

---

## 3. Technical Implementation

### 3.1 React Helmet Async Integration
**Package**: `react-helmet-async`

The SEO component (`/src/components/SEO.tsx`) provides:
- Dynamic meta tag management
- Automatic title and description updates
- Open Graph tag management
- JSON-LD structured data injection
- Twitter card configuration

**Usage Example**:
```tsx
import SEO from "@/components/SEO";
import { generateEventSchema } from "@/utils/structuredData";

export default function EventDetail() {
  const [event, setEvent] = useState(null);

  return (
    <>
      <SEO 
        title={event?.title}
        description={event?.description}
        keywords="kajian, event islami, dakwah"
        image={event?.poster_url}
        url={`https://terasdakwah.com/event/${event?.id}`}
        structuredData={generateEventSchema(event)}
      />
      {/* Page content */}
    </>
  );
}
```

### 3.2 Structured Data Utilities
**File**: `/src/utils/structuredData.ts`

Provides helper functions:
- `generateEventSchema()`: Creates Event schema for event pages
- `generateOrganizationSchema()`: Creates Organization schema
- `generateWebsiteSchema()`: Creates Website schema with search action
- `generateBreadcrumbSchema()`: Creates navigation breadcrumbs

### 3.3 App Configuration
**File**: `/src/App.tsx`

Wrapped with `HelmetProvider` to enable dynamic SEO management across all pages.

---

## 4. Performance Optimization

### 4.1 Core Web Vitals
- **LCP (Largest Contentful Paint)**: Optimized image loading
- **FID (First Input Delay)**: Efficient event handlers
- **CLS (Cumulative Layout Shift)**: Fixed layout dimensions

### 4.2 Image Optimization
- Lazy loading on event cards
- WebP format conversion for uploads
- Responsive images with proper dimensions

### 4.3 Code Splitting
- Lazy loading of route components
- Reduces initial bundle size
- Improves page load speed

---

## 5. Local SEO

### 5.1 Location-Based Optimization
- Event venue and city information in structured data
- Location schema for offline events
- City-specific event filtering

### 5.2 Mobile Optimization
- Mobile-first responsive design
- Touch-friendly interface
- Fast mobile page speed

---

## 6. Google Search Console Setup

### 6.1 Verification
1. Add property in Google Search Console
2. Verify ownership via HTML file or DNS record
3. Submit sitemap: `https://terasdakwah.com/sitemap.xml`

### 6.2 Monitoring
- Monitor indexing status
- Track search queries and impressions
- Monitor Core Web Vitals
- Check for crawl errors
- Review rich result eligibility

### 6.3 Optimization
- Fix crawl errors
- Improve click-through rate (CTR) with better titles/descriptions
- Monitor ranking keywords
- Analyze user behavior

---

## 7. Ongoing Maintenance

### 7.1 Regular Tasks
- **Monthly**: Review Google Search Console data
- **Quarterly**: Audit meta tags and descriptions
- **Quarterly**: Update structured data for new event types
- **Annually**: Review and update robots.txt and sitemap

### 7.2 Content Updates
- Keep event descriptions fresh and detailed
- Update event images/posters
- Add speaker information
- Include pricing and registration details

### 7.3 Link Building
- Encourage social media sharing
- Get backlinks from Islamic education websites
- Submit to local event directories
- Create partnerships with Islamic organizations

---

## 8. Monitoring & Analytics

### 8.1 Google Analytics Integration
- Track organic traffic
- Monitor user behavior
- Measure conversion rates
- Identify popular pages

### 8.2 Google Search Console
- Monitor search performance
- Track keyword rankings
- Check indexing status
- Monitor Core Web Vitals

### 8.3 Tools for Monitoring
- **Google PageSpeed Insights**: Monitor page speed
- **Google Mobile-Friendly Test**: Verify mobile optimization
- **Schema.org Validator**: Validate structured data
- **Lighthouse**: Audit performance and SEO

---

## 9. SEO Checklist

- [x] Meta tags (title, description, keywords)
- [x] Open Graph tags
- [x] Twitter card tags
- [x] Robots.txt
- [x] Sitemap.xml
- [x] Structured data (JSON-LD)
- [x] Mobile responsiveness
- [x] Page speed optimization
- [x] Image optimization
- [x] Internal linking
- [x] Alt text on images
- [x] Canonical URLs
- [x] Dynamic SEO component
- [ ] Google Search Console setup
- [ ] Google Analytics setup
- [ ] Backlink building
- [ ] Local SEO optimization

---

## 10. Next Steps

1. **Submit to Google Search Console**
   - Add property
   - Verify ownership
   - Submit sitemap

2. **Monitor Performance**
   - Check indexing status
   - Monitor search queries
   - Track rankings

3. **Build Backlinks**
   - Reach out to Islamic websites
   - Submit to event directories
   - Create partnerships

4. **Improve Content**
   - Add more event details
   - Include speaker bios
   - Add event reviews/testimonials

5. **Technical Improvements**
   - Implement server-side rendering (SSR) for better crawling
   - Add breadcrumb navigation
   - Implement FAQ schema for common questions

---

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org)
- [React Helmet Async](https://github.com/steverep/react-helmet-async)
- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [Google Search Console](https://search.google.com/search-console)

---

## Support

For questions or issues with SEO implementation, refer to the code comments in:
- `/src/components/SEO.tsx`
- `/src/utils/structuredData.ts`
- `/src/pages/Index.tsx`
