"use client";

import Link from "next/link";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Mail, href: "#", label: "Email" },
  ];

  const footerLinks = [
    {
      title: "Conference",
      links: [
        { label: "About", href: "#about" },
        { label: "Attendees", href: "/network" },
        { label: "Register", href: "/onboarding" },
      ],
    },
    {
      title: "Connect",
      links: [
        { label: "LinkedIn", href: "#" },
        { label: "Twitter", href: "#" },
        { label: "Contact", href: "#contact" },
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
                    <Link
                      href={link.href}
                      className="text-gray-600 hover:text-badger-red transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
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
            <div className="flex space-x-6 text-sm">
              <Link
                href="#privacy"
                className="text-gray-600 hover:text-badger-red transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="#terms"
                className="text-gray-600 hover:text-badger-red transition-colors duration-200"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}