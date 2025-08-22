import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodScannerProps {
  onNutritionExtracted: (data: NutritionData) => void;
}

export const FoodScanner = ({ onNutritionExtracted }: FoodScannerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractNutritionFromText = (text: string): NutritionData => {
    const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // Patterns to match nutrition values
    const patterns = {
      calories: /(?:calories|energy|kcal)[\s:]*(\d+(?:\.\d+)?)/i,
      protein: /protein[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      carbs: /(?:carbohydrate|carbs)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      fat: /(?:total\s+fat|fat)[\s:]*(\d+(?:\.\d+)?)\s*g/i
    };

    for (const [nutrient, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        nutrition[nutrient as keyof NutritionData] = parseFloat(match[1]);
      }
    }

    return nutrition;
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    
    try {
      toast({
        title: "Processing image...",
        description: "Extracting text from nutrition label",
      });

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m)
      });

      const text = result.data.text;
      setExtractedText(text);
      
      const nutrition = extractNutritionFromText(text);
      
      if (nutrition.calories > 0 || nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0) {
        onNutritionExtracted(nutrition);
        toast({
          title: "Success!",
          description: "Nutrition information extracted from label",
        });
      } else {
        toast({
          title: "No nutrition data found",
          description: "Try a clearer image of the nutrition facts panel",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "Processing failed",
        description: "Could not read the nutrition label. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-soft">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Scan Nutrition Label</h3>
        <p className="text-sm text-muted-foreground">
          Take a photo or upload an image of the nutrition facts panel
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={triggerFileSelect}
            disabled={isProcessing}
            className="flex items-center gap-2"
            variant="outline"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload Image
          </Button>
          
          <Button
            onClick={triggerFileSelect}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Take Photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {extractedText && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-left">
            <Label className="text-sm font-medium">Extracted Text:</Label>
            <p className="text-muted-foreground mt-1">{extractedText.slice(0, 200)}...</p>
          </div>
        )}
      </div>
    </Card>
  );
};