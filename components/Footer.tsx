"use client";

import Link from "next/link";
import { Instagram, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import WsbcLogo from "@/components/WsbcLogo";

export default function Footer() {
  const socialLinks = [
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/company/wisconsin-sports-business-conference",
      label: "LinkedIn",
    },
    { icon: Instagram, href: "https://www.instagram.com/wisconsinsbc/", label: "Instagram" },
  ];

  const footerLinks = [
    {
      title: "Conference",
      links: [
        { label: "About", href: "/#about" },
        { label: "Attendees", href: "/network" },
        { label: "Register", href: "/onboarding" },
      ],
    },
    {
      title: "Connect",
      links: [
        {
          label: "LinkedIn",
          href: "https://www.linkedin.com/company/wisconsin-sports-business-conference",
        },
        { label: "Instagram", href: "https://www.instagram.com/wisconsinsbc/" },
        { label: "Contact", href: "https://www.wisconsinsbc.com/contact" },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <WsbcLogo className="h-12 w-12 mb-4" size={48} />
            <h3 className="text-2xl font-bold text-badger-red mb-4">
              Wisconsin Sports Business Conference
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Connecting sports business professionals across Wisconsin. Network with industry leaders, 
              discover opportunities, and grow your career in sports.
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-badger-red hover:border-badger-red transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-gray-900 font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-600 hover:text-badger-red transition-colors duration-200 text-sm"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-badger-red transition-colors duration-200 text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Wisconsin Sports Business Conference. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}