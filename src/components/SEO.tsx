import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  canonicalUrl?: string;
  structuredData?: any;
}

export const SEO = ({
  title = 'Teras Dakwah — Tiket Kajian & Event Islami',
  description = 'Platform tiket Teras Dakwah. Temukan kajian, talkshow, dan event Islami terbaru di kota terdekatmu.',
  keywords = 'kajian islam, event islami, talkshow islam, tiket event, dakwah',
  image = 'https://res.cloudinary.com/dfjvcvbsn/image/upload/v1768960205/TD_Logo_anxcwb.png',
  url = 'https://terasdakwah.com',
  type = 'website',
  author = 'Teras Dakwah',
  canonicalUrl,
  structuredData,
}: SEOProps) => {
  const fullTitle = title.includes('Teras Dakwah') ? title : `${title} — Teras Dakwah`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Teras Dakwah" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@TerasDakwah" />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="Indonesian" />
      <meta name="revisit-after" content="7 days" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
