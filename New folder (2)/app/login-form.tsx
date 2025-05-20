"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/language-context";
import { getTranslation } from "@/lib/i18n/translations";
import Link from "next/link";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginError {
  message: string;
  status?: number;
}

export function LoginForm() {
  const { language, dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Starting login attempt...');
      console.log('Email:', email.trim());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const apiUrl = "http://localhost:5000/api/auth/login";
      console.log('Making fetch request to:', apiUrl);
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Failed to connect to server: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      clearTimeout(timeoutId);

      console.log('Response received:');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      // Get the response text first for debugging
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        console.error('Raw response that failed to parse:', responseText);
        throw new Error(`Invalid JSON response from server: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (!response.ok) {
        console.error('Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        const errorMessage = data?.message || data?.error || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (!data?.token) {
        console.error('No token in response:', data);
        throw new Error('No authentication token received from server');
      }

      // Store auth state
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify({ email: email.trim() }));
      localStorage.setItem("token", data.token);

      console.log('Login successful, stored token:', data.token);

      // Show success message
      toast({
        title: getTranslation(language, "loginSuccessful"),
        description: getTranslation(language, "welcomeBack"),
      });

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh(); // Refresh the page to update auth state

    } catch (error) {
      console.error('Login error details:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = getTranslation(language, "loginFailed");
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = getTranslation(language, "requestTimeout");
        } else if (error.message.includes('Failed to connect to server')) {
          errorMessage = "Cannot connect to server. Please check if the server is running at http://localhost:5000";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: getTranslation(language, "error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-t-4 border-t-primary shadow-lg">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
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
            className="w-full bg-primary hover:bg-secondary" 
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
              className="text-primary hover:underline"
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