import * as cheerio from "cheerio";
import { CompanyDetails } from "../types/index.js";

export class CompanyDetailParser {
    /**
     *  Parse company details from SNC company page HTML
     */
    parseCompanyDetails(html: string): CompanyDetails {
        const $ = cheerio.load(html);
        const details: CompanyDetails = {
            socialLinks: {},
        };

        // Extract website URL
        const websiteLink = $("#social-links-website");
        if (websiteLink.length > 0) {
            details.websiteUrl = websiteLink.attr("href");
        }

        // Extract careers URL from button onclick
        const careersButton = $("#careers-page");
        if (careersButton.length > 0) {
            const onclick = careersButton.attr("onclick") || "";
            //Extract URL from: window.open('URL', '_blank')
            const match = onclick.match(/window\.open\('([^']+)'/);
            if (match && match[1]) {
                details.websiteUrl = match[1];
            }
        }

        // Extract social links
        const socialLinkContainer = $("#social-links-icons-container");

        // Linkedin
        const linkedinLink = socialLinkContainer.find("a[onclick*='linkedin']");
        if (linkedinLink.length > 0) {
            details.socialLinks!.linkedin = linkedinLink.attr("href");
        }

        return details;
    }

    /**
     *  Validate that we got meaningful data
     */
    isValidCompanyDetails(details: CompanyDetails): boolean {
        return !!(details.websiteUrl || details.careersUrl);
    }
}