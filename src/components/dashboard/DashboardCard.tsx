
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import FadeInSection from '@/components/animations/FadeInSection';

interface DashboardCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  className,
  children,
  delay = 0,
}) => {
  return (
    <FadeInSection delay={delay} direction="up">
      <Card className={cn("h-full transition-all duration-200 hover:shadow-elevated", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </FadeInSection>
  );
};

export default DashboardCard;
