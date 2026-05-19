import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, Briefcase, Map, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px] pointer-events-none" />

      <header className="py-6 px-8 max-w-7xl w-full mx-auto flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
          <span className="text-xl font-bold tracking-tight">MyProjectory</span>
        </div>
        <div className="space-x-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="rounded-xl">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="rounded-xl px-6 bg-primary hover:bg-primary/90">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 z-10 mt-12 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Mission control for your career
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Build your portfolio.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Land the job.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop guessing what employers want. Measure your job readiness, identify skill gaps, and follow AI-generated roadmaps to your dream role.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-2xl px-8 h-14 text-base w-full sm:w-auto">
                Start Building Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="rounded-2xl px-8 h-14 text-base w-full sm:w-auto glass">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-24"
        >
          {[
            {
              title: "Measure Readiness",
              description: "Get a clear score on how ready you are for your target roles based on market demand and your skills.",
              icon: Target,
              color: "text-blue-500",
              bg: "bg-blue-500/10"
            },
            {
              title: "Skill Roadmaps",
              description: "Generate customized step-by-step roadmaps to learn the exact technologies employers are hiring for.",
              icon: Map,
              color: "text-primary",
              bg: "bg-primary/10"
            },
            {
              title: "Smart Portfolio",
              description: "Showcase your projects in a structured way that highlights problem-solving and technical depth.",
              icon: Briefcase,
              color: "text-secondary",
              bg: "bg-secondary/10"
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl glass border border-border/50 flex flex-col items-start text-left">
              <div className={`p-4 rounded-2xl ${feature.bg} ${feature.color} mb-6`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
