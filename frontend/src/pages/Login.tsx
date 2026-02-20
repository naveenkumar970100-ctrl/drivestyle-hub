import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setAuth } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoints = ["/api/auth/login", "http://localhost:5000/api/auth/login"];
      const timeoutMs = 10000;
      let res: Response | null = null;
      let data: unknown = {};
      let parsed = true;
      for (const url of endpoints) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), password }),
            signal: controller.signal,
          });
          res = r;
          parsed = true;
          try {
            data = await r.json();
          } catch {
            parsed = false;
            data = {};
          }
          window.clearTimeout(timer);
          if (res.ok || url === endpoints[endpoints.length - 1]) {
            break;
          }
        } catch (err) {
          window.clearTimeout(timer);
          if (err instanceof DOMException && err.name === "AbortError") {
            res = null;
            continue;
          }
          res = null;
        }
      }
      if (!res) {
        toast({ title: "Login failed", description: "Server not responding. Please try again.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? ((data as { message: string }).message || "").trim()
            : parsed
            ? "Invalid email or password"
            : "Login failed";
        toast({ title: "Login failed", description: message, variant: "destructive" });
        return;
      }
      type LoginResp = { user?: { email?: string; role?: string }; token?: string };
      const userObj = typeof data === "object" && data !== null ? ((data as LoginResp).user || { role: "", email: "" }) : { role: "", email: "" };
      const tokenVal = typeof data === "object" && data !== null ? ((data as LoginResp).token || "") : "";
      const lower = String((userObj as { role?: string }).role || "").toLowerCase();
      const roleOut = lower === "admin" ? "Admin" : lower === "staff" ? "Staff" : lower === "merchant" ? "Merchant" : "Customer";
      setAuth({ email: String((userObj as { email?: string }).email || email.trim()), role: roleOut, token: String(tokenVal || "") });
      const next = search.get("next");
      const routeMap: Record<string, string> = {
        Admin: "/dashboard/admin",
        Staff: "/dashboard/staff",
        Merchant: "/dashboard/merchant",
        Customer: "/dashboard/customer",
      };
      navigate(next || routeMap[roleOut] || "/");
      toast({ title: "Logged in successfully!", description: `Welcome back` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
            <Car className="h-7 w-7 text-accent" /> MotoHub
          </Link>
          <h1 className="font-heading text-3xl font-bold">Login</h1>
          <p className="mt-2 text-muted-foreground">Enter your credentials to access your account</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
            <Button type="submit" disabled={loading} className="w-full gradient-accent border-0 text-accent-foreground">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-accent font-medium hover:underline">Register</Link>
          </p>
          <div className="mt-2 text-center">
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-sm text-accent hover:underline">Forgot Password?</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset your password</DialogTitle>
                  <DialogDescription>Enter your email to receive a password reset link.</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = forgotEmail.trim();
                    if (!email) return;
                    toast({ title: "Reset link sent", description: "Check your inbox for further instructions." });
                    setForgotEmail("");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <Input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full gradient-accent border-0 text-accent-foreground">Send Reset Link</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <p className="mt-2 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-accent">← Back to Home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
