import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Receipt, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header/Nav */}
      <header className="border-b border-border relative z-50">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Splitzz</div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-foreground hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-foreground hover:text-primary transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </a>
          </div>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
          >
            <Link href={"/login"}>Sign In</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Grid */}
      <FeaturesSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
}

const HeroSection = memo(function HeroSection() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="flex flex-col items-center">
        {/* Hero Text & CTA */}
        <div className="text-center max-w-4xl mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
            <span>Split Costs,</span>
            <span className="text-primary"> Simplify Debts</span>
            <br />
            with Splitzz.
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 text-pretty leading-relaxed">
            Track shared expenses with friends and family. Never let money
            complicate relationships. Smart, fair, and effortless expense
            splitting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 shadow-lg shadow-primary/30"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-accent bg-transparent"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* App Screenshot */}
        <div className="w-full max-w-6xl relative">
          {/* Emerald glow effect behind image */}
          <div className="absolute -inset-4 bg-primary opacity-20 blur-3xl rounded-3xl" />
          <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20">
            <Image
              src="/images/image.png"
              alt="Splitzz App Dashboard"
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
})

const FeaturesSection = memo(function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Everything you need to split expenses
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Built for modern living. From roommates to travel groups.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="bg-card border-border p-8 hover:border-primary transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">
            Group Expenses
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Create groups for trips, households, or events. Add expenses and
            let Splitzz calculate who owes what automatically.
          </p>
        </Card>

        <Card className="bg-card border-border p-8 hover:border-primary transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">
            Smart Receipts
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Snap a photo of receipts and let AI extract the details. No more
            manual entry. Quick, accurate, effortless.
          </p>
        </Card>

        <Card className="bg-card border-border p-8 hover:border-primary transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">
            Fair Settlements
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Optimize debt settlement with smart algorithms. Settle up with
            fewer transactions and clear balances faster.
          </p>
        </Card>
      </div>
    </section>
  )
})

const CTASection = memo(function CTASection() {
  return (
    <section className="container mx-auto px-6 py-20">
      <Card className="bg-gradient-to-br from-card to-background border-primary p-12 lg:p-16 text-center relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gain opacity-10 blur-3xl rounded-full" />

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Ready to simplify your shared expenses?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who've made splitting bills stress-free.
            Get started in seconds.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12"
          >
            Create Free Account
          </Button>
        </div>
      </Card>
    </section>
  )
})

const FooterSection = memo(function FooterSection() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold text-primary mb-4">
              Splitzz
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Making shared expenses simple and stress-free.
            </p>
          </div>
          <div>
            <h4 className="text-foreground font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-foreground font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-foreground font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground text-sm">
          © 2025 Splitzz. All rights reserved.
        </div>
      </div>
    </footer>
  )
})
