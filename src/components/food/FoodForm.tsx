import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodFormProps {
  initialNutrition?: NutritionData;
  onFoodAdded: () => void;
}

export const FoodForm = ({ initialNutrition, onFoodAdded }: FoodFormProps) => {
  const [foodName, setFoodName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [nutrition, setNutrition] = useState<NutritionData>(
    initialNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please sign in to add foods",
          variant: "destructive",
        });
        return;
      }

      // Calculate adjusted nutrition based on quantity
      const adjustedNutrition = {
        calories: nutrition.calories * quantity,
        protein: nutrition.protein * quantity,
        carbs: nutrition.carbs * quantity,
        fat: nutrition.fat * quantity,
      };

      // Get or create today's daily log
      const today = new Date().toISOString().split('T')[0];
      let { data: dailyLog, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();

      if (logError && logError.code === 'PGRST116') {
        // No log exists for today, create one
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .insert({
            user_id: session.user.id,
            date: today,
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        dailyLog = newLog;
      } else if (logError) {
        throw logError;
      }

      // Add food entry
      const { error: entryError } = await supabase
        .from('food_entries')
        .insert({
          user_id: session.user.id,
          daily_log_id: dailyLog.id,
          food_name: foodName,
          food_brand: brand || null,
          quantity,
          calories: adjustedNutrition.calories,
          protein: adjustedNutrition.protein,
          carbs: adjustedNutrition.carbs,
          fat: adjustedNutrition.fat,
        });

      if (entryError) throw entryError;

      // Update daily log totals
      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({
          total_calories: dailyLog.total_calories + adjustedNutrition.calories,
          total_protein: dailyLog.total_protein + adjustedNutrition.protein,
          total_carbs: dailyLog.total_carbs + adjustedNutrition.carbs,
          total_fat: dailyLog.total_fat + adjustedNutrition.fat,
        })
        .eq('id', dailyLog.id);

      if (updateError) throw updateError;

      // Save to foods database for future use
      if (foodName.trim()) {
        await supabase
          .from('foods')
          .upsert({
            user_id: session.user.id,
            name: foodName,
            brand: brand || null,
            calories_per_serving: nutrition.calories,
            protein_per_serving: nutrition.protein,
            carbs_per_serving: nutrition.carbs,
            fat_per_serving: nutrition.fat,
          }, {
            onConflict: 'user_id,name,brand'
          });
      }

      toast({
        title: "Success!",
        description: `Added ${foodName} to your daily log`,
      });

      // Reset form
      setFoodName('');
      setBrand('');
      setQuantity(1);
      if (!initialNutrition) {
        setNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
      
      onFoodAdded();
    } catch (error) {
      console.error('Error adding food:', error);
      toast({
        title: "Error",
        description: "Failed to add food. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-soft">
      <h3 className="text-lg font-semibold mb-4">Add Food Details</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foodName">Food Name *</Label>
            <Input
              id="foodName"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g., Greek Yogurt"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Chobani"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Serving Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.1"
            min="0.1"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              type="number"
              min="0"
              value={nutrition.calories}
              onChange={(e) => setNutrition(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protein">Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              step="0.1"
              min="0"
              value={nutrition.protein}
              onChange={(e) => setNutrition(prev => ({ ...prev, protein: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbs">Carbs (g)</Label>
            <Input
              id="carbs"
              type="number"
              step="0.1"
              min="0"
              value={nutrition.carbs}
              onChange={(e) => setNutrition(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat">Fat (g)</Label>
            <Input
              id="fat"
              type="number"
              step="0.1"
              min="0"
              value={nutrition.fat}
              onChange={(e) => setNutrition(prev => ({ ...prev, fat: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !foodName.trim()}>
          {isSubmitting ? "Adding..." : "Add to Daily Log"}
        </Button>
      </form>
    </Card>
  );
};