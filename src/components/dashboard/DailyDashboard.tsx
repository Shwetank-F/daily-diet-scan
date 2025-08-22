import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NutritionCard } from '@/components/nutrition/NutritionCard';
import { FoodScanner } from '@/components/food/FoodScanner';
import { FoodForm } from '@/components/food/FoodForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Utensils, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FoodEntry {
  id: string;
  food_name: string;
  food_brand?: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyLog {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DailyDashboard = () => {
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [scannedNutrition, setScannedNutrition] = useState<NutritionData | null>(null);
  const { toast } = useToast();

  const defaultGoals = {
    calories: 2000,
    protein: 150,
    carbs: 225,
    fat: 75
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Load daily log
      const { data: logData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();

      if (logData) {
        setDailyLog(logData);
        
        // Load food entries for today
        const { data: entriesData } = await supabase
          .from('food_entries')
          .select('*')
          .eq('daily_log_id', logData.id)
          .order('created_at', { ascending: false });

        setFoodEntries(entriesData || []);
      } else {
        // No log for today yet
        setDailyLog({
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0
        });
        setFoodEntries([]);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
      toast({
        title: "Error",
        description: "Failed to load today's data",
        variant: "destructive",
      });
    }
  };

  const handleNutritionExtracted = (nutrition: NutritionData) => {
    setScannedNutrition(nutrition);
    setShowScanner(false);
    setShowManualForm(true);
  };

  const handleFoodAdded = () => {
    loadTodayData();
    setShowManualForm(false);
    setShowScanner(false);
    setScannedNutrition(null);
  };

  const deleteFoodEntry = async (entryId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const entry = foodEntries.find(e => e.id === entryId);
      if (!entry) return;

      // Delete the entry
      const { error: deleteError } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId);

      if (deleteError) throw deleteError;

      // Update daily log totals
      if (dailyLog) {
        const today = new Date().toISOString().split('T')[0];
        const { error: updateError } = await supabase
          .from('daily_logs')
          .update({
            total_calories: Math.max(0, dailyLog.total_calories - entry.calories),
            total_protein: Math.max(0, dailyLog.total_protein - entry.protein),
            total_carbs: Math.max(0, dailyLog.total_carbs - entry.carbs),
            total_fat: Math.max(0, dailyLog.total_fat - entry.fat),
          })
          .eq('user_id', session.user.id)
          .eq('date', today);

        if (updateError) throw updateError;
      }

      toast({
        title: "Deleted",
        description: "Food entry removed",
      });

      loadTodayData();
    } catch (error) {
      console.error('Error deleting food entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Daily Diet Scan
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Today's Nutrition Overview */}
        {dailyLog && (
          <NutritionCard
            title="Today's Progress"
            nutrition={{
              calories: dailyLog.total_calories,
              protein: dailyLog.total_protein,
              carbs: dailyLog.total_carbs,
              fat: dailyLog.total_fat
            }}
            goals={defaultGoals}
          />
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => setShowScanner(true)}
            className="h-16 text-lg bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            <Utensils className="w-6 h-6 mr-2" />
            Scan Nutrition Label
          </Button>
          
          <Button
            onClick={() => setShowManualForm(true)}
            variant="outline"
            className="h-16 text-lg"
            size="lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add Manually
          </Button>
        </div>

        {/* Scanner */}
        {showScanner && (
          <div className="space-y-4">
            <FoodScanner onNutritionExtracted={handleNutritionExtracted} />
            <Button
              onClick={() => setShowScanner(false)}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Food Form */}
        {showManualForm && (
          <div className="space-y-4">
            <FoodForm
              initialNutrition={scannedNutrition || undefined}
              onFoodAdded={handleFoodAdded}
            />
            <Button
              onClick={() => {
                setShowManualForm(false);
                setScannedNutrition(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Today's Food Entries */}
        {foodEntries.length > 0 && (
          <Card className="p-6 bg-gradient-card shadow-soft">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Today's Foods
            </h3>
            <div className="space-y-3">
              {foodEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {entry.food_name}
                      {entry.food_brand && (
                        <span className="text-sm text-muted-foreground ml-1">
                          ({entry.food_brand})
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {entry.quantity}x serving • {Math.round(entry.calories)} cal
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground text-right">
                      <div>P: {Math.round(entry.protein)}g</div>
                      <div>C: {Math.round(entry.carbs)}g</div>
                      <div>F: {Math.round(entry.fat)}g</div>
                    </div>
                    <Button
                      onClick={() => deleteFoodEntry(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};