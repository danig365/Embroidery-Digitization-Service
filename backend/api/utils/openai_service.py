import os
import requests
import base64

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not set in environment variables")
    
    def generate_image(self, prompt, size="1024x1024", quality="high"):
        """
        Generate image using gpt-image-1-mini model
        This model returns base64 by default
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Don't include response_format - gpt-image-1-mini returns base64 automatically
            data = {
                "model": "gpt-image-1-mini",
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": quality
            }
            
            print(f"🎨 Generating image with model: gpt-image-1-mini")
            print(f"📝 Prompt: {prompt[:100]}...")
            print(f"🎯 Quality: {quality}, Size: {size}")
            
            response = requests.post(
                "https://api.openai.com/v1/images/generations",
                headers=headers,
                json=data,
                timeout=120
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Check if response has data
            if 'data' not in result or len(result['data']) == 0:
                print(f"❌ No data in response")
                return {
                    'success': False,
                    'error': 'No image data returned from API'
                }
            
            image_data = result['data'][0]
            
            # Handle base64 response (default for gpt-image-1-mini)
            if 'b64_json' in image_data:
                print(f"✅ Image generated successfully (base64 format)")
                print(f"📊 Usage: {result.get('usage', {})}")
                return {
                    'success': True,
                    'image_url': None,
                    'b64_json': image_data['b64_json']
                }
            # Handle URL response (fallback)
            elif 'url' in image_data:
                print(f"✅ Image generated successfully (URL format)")
                return {
                    'success': True,
                    'image_url': image_data['url'],
                    'b64_json': None
                }
            else:
                print(f"❌ Unexpected response format: {list(image_data.keys())}")
                return {
                    'success': False,
                    'error': f'Unexpected API response format'
                }
            
        except requests.exceptions.Timeout:
            error_msg = "Image generation timeout. The OpenAI API is taking longer than expected. Please try again in a moment."
            print(f"❌ Timeout Error: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except requests.exceptions.ConnectionError:
            error_msg = "Connection error. Unable to reach OpenAI API. Please check your internet connection."
            print(f"❌ Connection Error: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = str(e)
            if e.response is not None:
                try:
                    error_detail = e.response.json()
                    error_msg = error_detail.get('error', {}).get('message', str(e))
                except:
                    error_msg = e.response.text
            
            print(f"❌ OpenAI API Error: {error_msg}")
            return {
                'success': False,
                'error': f"OpenAI API Error: {error_msg}"
            }
            
        except Exception as e:
            print(f"❌ Image generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'Error: {str(e)}'
            }
    
    def generate_dual_images(self, prompt, style="", size="1024x1024", quality="high"):
        """
        Generate TWO images: normal style and embroidery style preview
        Returns both images for customer to see what their embroidery will look like
        """
        try:
            print(f"\n🎨 DUAL IMAGE GENERATION")
            print(f"📝 Base Prompt: {prompt}")
            print(f"🎯 Style: {style if style else 'Default'}")
            print(f"="*60)
            
            # Image 1: Normal style
            print(f"\n[1/2] Generating normal image...")
            normal_prompt = f"{prompt} {style}" if style else prompt
            normal_result = self.generate_image(normal_prompt, size, quality)
            
            if not normal_result['success']:
                return {
                    'success': False,
                    'error': f"Normal image generation failed: {normal_result['error']}"
                }
            
            # Image 2: Embroidery style preview
            print(f"\n[2/2] Generating embroidery preview...")
            embroidery_prompt = f"{prompt}, embroidery style, textile art, stitched design, thread work"
            embroidery_result = self.generate_image(embroidery_prompt, size, quality)
            
            if not embroidery_result['success']:
                return {
                    'success': False,
                    'error': f"Embroidery preview generation failed: {embroidery_result['error']}"
                }
            
            print(f"\n✅ Both images generated successfully!")
            print(f"="*60)
            
            return {
                'success': True,
                'normal_image': normal_result,
                'embroidery_preview': embroidery_result
            }
            
        except Exception as e:
            print(f"❌ Dual generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'Dual generation error: {str(e)}'
            }
    
    def save_base64_image(self, b64_data, save_path):
        """
        Save base64 encoded image to file
        """
        try:
            print(f"💾 Saving base64 image to: {save_path}")
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(b64_data)
            
            # Write to file
            with open(save_path, 'wb') as f:
                f.write(image_bytes)
            
            file_size = len(image_bytes)
            print(f"✅ Image saved successfully: {save_path} ({file_size:,} bytes)")
            return True
            
        except Exception as e:
            print(f"❌ Error saving base64 image: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def download_image(self, url, save_path):
        """
        Download image from URL to local path
        """
        try:
            print(f"⬇️ Downloading image from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            with open(save_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✅ Image downloaded to: {save_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error downloading image: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
