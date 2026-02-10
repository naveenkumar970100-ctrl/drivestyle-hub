import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo login — maps to dashboards
    const routes: Record<string, string> = {
      admin: "/dashboard/admin",
      staff: "/dashboard/staff",
      merchant: "/dashboard/merchant",
      customer: "/dashboard/customer",
    };
    toast({ title: "Logged in successfully!", description: `Welcome back as ${role}` });
    navigate(routes[role] || "/dashboard/customer");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 gradient-hero lg:flex lg:items-center lg:justify-center">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <Car className="mx-auto h-20 w-20 text-accent" />
          <h2 className="mt-6 font-heading text-4xl font-bold text-primary-foreground">Welcome Back</h2>
          <p className="mt-2 text-primary-foreground/70">Login to manage your vehicle services</p>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-heading text-2xl font-bold lg:hidden">
            <Car className="h-7 w-7 text-accent" /> AutoServ
          </Link>
          <h1 className="font-heading text-3xl font-bold">Login</h1>
          <p className="mt-2 text-muted-foreground">Enter your credentials to access your account</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gradient-accent border-0 text-accent-foreground">Login</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-accent font-medium hover:underline">Register</Link>
          </p>
          <p className="mt-2 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-accent">← Back to Home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
