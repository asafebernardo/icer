import FooterContactStrip from "@/components/layout/FooterContactStrip";
import RecaptchaFooterNotice from "@/components/security/RecaptchaFooterNotice";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import { hasSiteContactDetails } from "@/lib/contactDetails";

export default function Footer() {
  const contactDetails = useSiteContactDetails();
  const showContact = hasSiteContactDetails(contactDetails);

  return (
    <footer className="relative border-t border-border/80 bg-background text-foreground pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
      <div className="container-page relative space-y-2 py-3 text-center sm:py-3.5">
        {showContact ? (
          <FooterContactStrip details={contactDetails} />
        ) : null}
        <RecaptchaFooterNotice />
        <p className="text-[11px] text-muted-foreground/90">
          © {new Date().getFullYear()} ICER Chapecó. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
