export const dynamic = "force-dynamic";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StickyCta } from "@/components/site/StickyCta";
import { CookieBanner } from "@/components/site/CookieBanner";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSettings } from "@/lib/queries";
import { organizationLd } from "@/lib/seo";
import { telHref } from "@/lib/format";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const tel = telHref(settings.phone);
  return (
    <>
      <div className="flex min-h-screen flex-col">
        {settings.bannerEnabled && settings.bannerText && <AnnouncementBar text={settings.bannerText} />}
        <Header phone={settings.phone} telHref={tel} />
        <main id="sadrzaj" className="flex-1">
          {children}
        </main>
        <Footer settings={settings} />
        <StickyCta telHref={tel} />
        <CookieBanner />
      </div>
      <JsonLd data={organizationLd(settings)} />
    </>
  );
}
