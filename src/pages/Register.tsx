import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [role, setRole] = useState("customer");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (role === "staff" || role === "merchant") {
      toast({ title: "Registration submitted!", description: "Your account is pending admin approval. You'll be notified once approved." });
    } else {
      toast({ title: "Registration successful!", description: "Welcome to AutoServ!" });
    }
    navigate("/login");
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 gradient-hero lg:flex lg:items-center lg:justify-center">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <Car className="mx-auto h-20 w-20 text-accent" />
          <h2 className="mt-6 font-heading text-4xl font-bold text-primary-foreground">Join AutoServ</h2>
          <p className="mt-2 text-primary-foreground/70">Create your account and get started</p>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-heading text-2xl font-bold lg:hidden">
            <Car className="h-7 w-7 text-accent" /> AutoServ
          </Link>
          <h1 className="font-heading text-3xl font-bold">Register</h1>
          <p className="mt-2 text-muted-foreground">Create your account to access our services</p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Register as</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                </SelectContent>
              </Select>
              {(role === "staff" || role === "merchant") && (
                <p className="mt-1 text-xs text-accent">* Requires admin approval after registration</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Full Name</label>
              <Input placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <Input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={(e) => update("password", e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirm Password</label>
              <Input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gradient-accent border-0 text-accent-foreground">Register</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Login</Link>
          </p>
          <p className="mt-2 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-accent">← Back to Home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
