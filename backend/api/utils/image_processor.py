from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os

class ImageProcessor:
    def load_image(self, image_path):
        """Load and convert image to RGB"""
        try:
            img = Image.open(image_path)
            return img.convert('RGB')
        except Exception as e:
            raise ValueError(f"Failed to load image: {str(e)}")
    
    def reduce_colors(self, img, num_colors):
        """Reduce image to specified number of colors"""
        if num_colors < 2 or num_colors > 15:
            raise ValueError("Number of colors must be between 2 and 15")
        
        img = img.convert('RGB')
        # Use PIL's quantize with better quality
        img_quantized = img.quantize(colors=num_colors, method=2, dither=0)
        return img_quantized.convert('RGB')
    
    def extract_palette(self, img, max_colors=15):
        """Extract color palette from image"""
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)
        
        color_counts = {}
        for pixel in pixels:
            key = tuple(pixel)
            color_counts[key] = color_counts.get(key, 0) + 1
        
        sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
        
        palette = []
        total_pixels = len(pixels)
        
        for color_rgb, count in sorted_colors[:max_colors]:
            # Skip very light colors (likely background)
            brightness = sum(color_rgb)
            if brightness > 700:
                continue
            
            palette.append({
                'r': int(color_rgb[0]),
                'g': int(color_rgb[1]),
                'b': int(color_rgb[2]),
                'hex': '#{:02x}{:02x}{:02x}'.format(
                    int(color_rgb[0]),
                    int(color_rgb[1]),
                    int(color_rgb[2])
                ),
                'percentage': round((count / total_pixels) * 100, 2)
            })
        
        return palette
    
    def resize_image(self, img, max_width=400, max_height=400):
        """
        Resize image to reasonable size for embroidery
        
        CRITICAL: Smaller images = fewer stitches
        400x400 is optimal for embroidery conversion
        """
        # Calculate aspect ratio
        original_width, original_height = img.size
        aspect_ratio = original_width / original_height
        
        # Determine new size maintaining aspect ratio
        if original_width > original_height:
            new_width = min(max_width, original_width)
            new_height = int(new_width / aspect_ratio)
        else:
            new_height = min(max_height, original_height)
            new_width = int(new_height * aspect_ratio)
        
        # Ensure minimum size
        if new_width < 100:
            new_width = 100
        if new_height < 100:
            new_height = 100
        
        print(f"📐 Resizing from {original_width}x{original_height} to {new_width}x{new_height}")
        
        # Use LANCZOS for high-quality downsampling
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        return img
    
    def add_text_overlay(self, img, text_content, text_font, text_style, text_size, text_color, 
                        text_outline_color, text_outline_thickness, text_position_x, text_position_y):
        """
        Add text overlay to image with specified styling
        
        Args:
            img: PIL Image object
            text_content: Text to render
            text_font: Font family (Arial, Times New Roman, etc.)
            text_style: Font style (Regular, Bold, Italic, Bold Italic)
            text_size: Font size in pixels
            text_color: Hex color for text (e.g., #000000)
            text_outline_color: Hex color for outline (e.g., #FFFFFF)
            text_outline_thickness: Outline thickness in pixels
            text_position_x: X position as percentage (0-100)
            text_position_y: Y position as percentage (0-100)
        """
        if not text_content or not text_content.strip():
            return img
        
        try:
            # Create a copy to avoid modifying original
            img_copy = img.copy()
            draw = ImageDraw.Draw(img_copy, 'RGBA')
            
            # Try to load appropriate font
            font = self._get_font(text_font, text_style, text_size)
            
            # Convert hex colors to RGB tuples
            text_rgb = self._hex_to_rgb(text_color)
            outline_rgb = self._hex_to_rgb(text_outline_color)
            
            # Calculate position
            img_width, img_height = img_copy.size
            x = int((text_position_x / 100) * img_width)
            y = int((text_position_y / 100) * img_height)
            
            # Get text bounding box to center it at the position
            bbox = draw.textbbox((0, 0), text_content, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center the text at the specified position
            x = x - (text_width // 2)
            y = y - (text_height // 2)
            
            # Draw text with outline
            if text_outline_thickness > 0:
                # Draw outline by drawing text multiple times around the main position
                for adj_x in range(-text_outline_thickness, text_outline_thickness + 1):
                    for adj_y in range(-text_outline_thickness, text_outline_thickness + 1):
                        if adj_x != 0 or adj_y != 0:
                            draw.text(
                                (x + adj_x, y + adj_y),
                                text_content,
                                font=font,
                                fill=(*outline_rgb, 255)
                            )
            
            # Draw main text
            draw.text(
                (x, y),
                text_content,
                font=font,
                fill=(*text_rgb, 255)
            )
            
            return img_copy
        except Exception as e:
            print(f"⚠️ Error adding text overlay: {str(e)}")
            return img
    
    def _get_font(self, font_family, font_style, font_size):
        """
        Get PIL Font object with fallback to default
        
        Tries to load system fonts, falls back to default if not available
        """
        try:
            # Map style names to weight/slant
            style_map = {
                'Regular': ('normal', 'roman'),
                'Bold': ('bold', 'roman'),
                'Italic': ('normal', 'italic'),
                'Bold Italic': ('bold', 'italic'),
            }
            weight, slant = style_map.get(font_style, ('normal', 'roman'))
            
            # Common font paths on Windows
            font_paths = [
                f"C:\\Windows\\Fonts\\{font_family.replace(' ', '')}{weight.capitalize()}{slant.capitalize()}.ttf",
                f"C:\\Windows\\Fonts\\{font_family.replace(' ', '')}.ttf",
                f"C:\\Windows\\Fonts\\arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux fallback
                "/System/Library/Fonts/Arial.ttf",  # macOS fallback
            ]
            
            # Try common font file patterns
            for path in font_paths:
                if os.path.exists(path):
                    return ImageFont.truetype(path, font_size)
            
            # If no font found, return default
            print(f"⚠️ Font {font_family} {font_style} not found, using default")
            return ImageFont.load_default()
        except Exception as e:
            print(f"⚠️ Error loading font: {str(e)}, using default")
            return ImageFont.load_default()
    
    def _hex_to_rgb(self, hex_color):
        """Convert hex color (e.g., #FFFFFF) to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def create_embroidery_preview(self, img):
        """
        Create embroidery-style preview of image
        Simulates how the image would look as embroidery by:
        1. Reducing colors to typical thread count
        2. Adding texture/crosshatch effect
        3. Posterizing to create distinct stitch areas
        """
        try:
            from PIL import ImageFilter, ImageOps
            
            # 1. Reduce to embroidery-friendly color count (8-12 colors max)
            img_small = img.copy()
            # Reduce colors to 10 (typical embroidery thread count)
            img_reduced = img_small.quantize(colors=10, dither=1)
            img_reduced = img_reduced.convert('RGB')
            
            # 2. Posterize to create cleaner stitch-like blocks
            img_posterized = ImageOps.posterize(img_reduced, 4)
            
            # 3. Apply slight edge enhancement to simulate stitches
            img_enhanced = img_posterized.filter(ImageFilter.EDGE_ENHANCE)
            
            # 4. Apply smoothing but keep edges crisp
            img_final = img_enhanced.filter(ImageFilter.SMOOTH_MORE)
            
            return img_final
            
        except Exception as e:
            print(f"⚠️ Error creating embroidery preview: {str(e)}")
            # Fallback: just reduce colors
            import traceback
            traceback.print_exc()
            return img.quantize(colors=10, dither=1).convert('RGB')