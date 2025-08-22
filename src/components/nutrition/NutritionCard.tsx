import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionCardProps {
  title: string;
  nutrition: NutritionData;
  goals?: NutritionData;
  className?: string;
}

export const NutritionCard = ({ title, nutrition, goals, className }: NutritionCardProps) => {
  const nutrients = [
    {
      name: 'Calories',
      value: nutrition.calories,
      goal: goals?.calories || 2000,
      color: 'calories',
      unit: 'cal'
    },
    {
      name: 'Protein',
      value: nutrition.protein,
      goal: goals?.protein || 150,
      color: 'protein',
      unit: 'g'
    },
    {
      name: 'Carbs',
      value: nutrition.carbs,
      goal: goals?.carbs || 225,
      color: 'carbs',
      unit: 'g'
    },
    {
      name: 'Fat',
      value: nutrition.fat,
      goal: goals?.fat || 75,
      color: 'fat',
      unit: 'g'
    }
  ];

  return (
    <Card className={`p-6 bg-gradient-card shadow-soft ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {nutrients.map((nutrient) => {
          const percentage = goals ? Math.min((nutrient.value / nutrient.goal) * 100, 100) : 0;
          
          return (
            <div key={nutrient.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{nutrient.name}</span>
                <span className="text-sm text-muted-foreground">
                  {nutrient.value}{nutrient.unit}
                  {goals && <span className="text-xs">/{nutrient.goal}{nutrient.unit}</span>}
                </span>
              </div>
              {goals && (
                <Progress 
                  value={percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': `hsl(var(--${nutrient.color}))`,
                  } as React.CSSProperties}
                />
              )}
              {!goals && (
                <div 
                  className={`h-2 rounded-full bg-${nutrient.color} opacity-60`}
                  style={{ backgroundColor: `hsl(var(--${nutrient.color}))` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};