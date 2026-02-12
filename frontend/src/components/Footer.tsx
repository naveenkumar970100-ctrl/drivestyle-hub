import { Link } from "react-router-dom";
import { Car, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold">
              <Car className="h-6 w-6 text-accent" />
              MotoHub
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Premium car & bike services. Expert care for your vehicle.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-lg">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-accent transition-colors">About Us</Link>
              <Link to="/services" className="hover:text-accent transition-colors">Services</Link>
              <Link to="/careers" className="hover:text-accent transition-colors">Careers</Link>
              <Link to="/blog" className="hover:text-accent transition-colors">Blog</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-lg">Support</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link>
              <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
              <Link to="/login" className="hover:text-accent transition-colors">Login</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-lg">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> info@motohub.com</span>
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" /> +1 (555) 123-4567</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> 123 Auto Lane, CA</span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © 2026 MotoHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
