"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/language-context";
import { getTranslation } from "@/lib/i18n/translations";
import Link from "next/link";
import { EyeIcon, EyeOffIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LoginError {
  message: string;
  status?: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface LoginResponse {
  status: 'success' | 'error';
  message: string;
  token?: string;
  user?: User;
}

export function LoginForm() {
  const { language, dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Memoize the submit handler to prevent unnecessary re-renders
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation before making the API call
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        signal: controller.signal
        });

      clearTimeout(timeoutId);

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid response from server");
      }

      // Check if user is deactivated
      if (data.user.isActive === false) {
        setError("Your account has been deactivated. Please contact your administrator.");
        return;
      }

      // Store auth state
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      // Show success message
      toast({
        title: getTranslation(language, "loginSuccessful"),
        description: data.message || getTranslation(language, "welcomeBack"),
      });

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();

    } catch (error) {
      let errorMessage = getTranslation(language, "loginFailed");
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. Please try again.";
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setError(errorMessage);
      toast({
        title: getTranslation(language, "error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [email, password, language, router, toast]);

  return (
    <Card className="border-t-4 border-t-primary shadow-lg">
      <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
        <CardContent className="space-y-4 pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4 animate-in slide-in-from-top duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{getTranslation(language, "error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{getTranslation(language, "email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={language === "en" ? "your@email.com" : "بريدك@مثال.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(dir === "rtl" && "text-right")}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{getTranslation(language, "password")}</Label>
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-primary"
                disabled={isLoading}
              >
                {getTranslation(language, "forgotPassword")}
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(dir === "rtl" && "text-right")}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-secondary transition-colors duration-200" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getTranslation(language, "signingIn")}
              </>
            ) : (
              getTranslation(language, "signIn")
            )}
          </Button>
          <p className="text-center text-sm">
            {getTranslation(language, "dontHaveAccount")}{" "}
            <Link 
              href="/register" 
              className="text-primary hover:underline transition-colors duration-200"
              tabIndex={isLoading ? -1 : 0}
            >
              {getTranslation(language, "createAccount")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}