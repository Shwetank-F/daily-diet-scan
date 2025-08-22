import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

import { NutritionData } from '@/types/nutrition';

interface FoodScannerProps {
  onNutritionExtracted: (data: NutritionData) => void;
}

export const FoodScanner = ({ onNutritionExtracted }: FoodScannerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractNutritionFromText = (text: string): NutritionData => {
    // Clean and normalize the text for better parsing
    const cleanText = text.replace(/[^\w\s\.\-:\/\%]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    
    const nutrition: NutritionData = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // Enhanced patterns to match nutrition values
    const patterns = {
      calories: /(?:calories|energy|kcal)[\s:]*(\d+(?:\.\d+)?)/i,
      protein: /protein[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      carbs: /(?:total\s*carbohydrate|carbohydrate|carbs)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      fat: /(?:total\s*fat|total fat|fat)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      saturatedFat: /(?:saturated\s*fat|sat\s*fat)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      transFat: /(?:trans\s*fat|trans fat)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      cholesterol: /cholesterol[\s:]*(\d+(?:\.\d+)?)\s*mg/i,
      sodium: /sodium[\s:]*(\d+(?:\.\d+)?)\s*mg/i,
      fiber: /(?:dietary\s*fiber|fiber)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      sugar: /(?:total\s*sugars|sugars)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      addedSugar: /(?:added\s*sugars|includes\s*\d+g\s*added\s*sugars)[\s:]*(\d+(?:\.\d+)?)\s*g/i,
      vitaminD: /(?:vitamin\s*d|vit\s*d)[\s:]*(\d+(?:\.\d+)?)\s*(?:mcg|µg)/i,
      calcium: /calcium[\s:]*(\d+(?:\.\d+)?)\s*mg/i,
      iron: /iron[\s:]*(\d+(?:\.\d+)?)\s*mg/i,
      potassium: /potassium[\s:]*(\d+(?:\.\d+)?)\s*mg/i
    };

    // Extract each nutrient
    for (const [nutrient, pattern] of Object.entries(patterns)) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value >= 0) {
          nutrition[nutrient as keyof NutritionData] = value;
        }
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
      
      // Check if any nutrition data was found
      const hasNutritionData = Object.values(nutrition).some(value => value > 0);
      
      if (hasNutritionData) {
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
          <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-left max-h-40 overflow-y-auto">
            <Label className="text-sm font-medium mb-2 block">Extracted Text:</Label>
            <pre className="text-muted-foreground text-xs whitespace-pre-wrap font-mono">
              {extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};