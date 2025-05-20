"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/language-context";
import { getTranslation } from "@/lib/i18n/translations";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export function RegistrationForm() {
  const { language, dir } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const router = useRouter();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = getTranslation(language, "nameRequired");
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = getTranslation(language, "emailRequired");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = getTranslation(language, "invalidEmail");
      isValid = false;
    }

    if (!password) {
      newErrors.password = getTranslation(language, "passwordRequired");
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = getTranslation(language, "passwordTooShort");
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = getTranslation(language, "passwordsDoNotMatch");
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Call your API endpoint for registration
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          email: email,
          password: password,
          confirmPassword: confirmPassword,
        }),
      });

      if (!response.ok) {
        // Handle API errors (e.g., duplicate email, server error)
        const errorData = await response.json();
        throw new Error(errorData.message || getTranslation(language, "registrationFailed"));
      }

      // Registration successful
      toast({
        title: getTranslation(language, "registrationSuccessful"),
        description: getTranslation(language, "accountCreatedSuccessfully"),
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      toast({
        title: getTranslation(language, "error"),
        description: error.message || getTranslation(language, "registrationFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-t-4 border-t-primary">
      <div className="flex justify-center pt-6">
        <Image src="/images/stc-logo.png" alt="STC Logo" width={80} height={40} className="h-12 w-auto" />
      </div>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">{getTranslation(language, "fullName")}</Label>
            <Input
              id="name"
              type="text"
              placeholder={language === "en" ? "John Doe" : "محمد عبدالله"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={dir === "rtl" ? "text-right" : ""}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{getTranslation(language, "email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={language === "en" ? "your@email.com" : "بريدك@مثال.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={dir === "rtl" ? "text-right" : ""}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{getTranslation(language, "password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={dir === "rtl" ? "text-right" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{getTranslation(language, "confirmPassword")}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={dir === "rtl" ? "text-right" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary hover:bg-secondary" disabled={isLoading}>
            {isLoading ? getTranslation(language, "creatingAccount") : getTranslation(language, "createAccount")}
          </Button>
          <p className="text-center text-sm">
            {getTranslation(language, "alreadyHaveAccount")}{" "}
            <Link href="/" className="text-primary hover:underline">
              {getTranslation(language, "signIn")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}