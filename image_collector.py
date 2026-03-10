'''
Function:
read images in `assets/images/image_bar/` and generate `_data/image_bar.yml` automatically, 
then these images will be shown in the image bar.
'''

import re
import os

def collect_images(image_dir, output_file):
    # 获取目录下的所有文件
    files = os.listdir(image_dir)
    
    # 过滤出图片文件（可以根据需要调整正则表达式）
    image_files = [f for f in files if re.match(r'.*\.(jpg|jpeg|png|gif)$', f, re.IGNORECASE)]
    
    # 生成 YAML 内容
    yaml_content = 'images:\n'
    for image in image_files:
        yaml_content += f'  - /{image_dir}{image}\n'
    
    # 写入到输出文件
    output_file_path = os.path.join(os.getcwd(), output_file)
    with open(output_file_path, 'w') as f:
        f.write(yaml_content)

if __name__ == "__main__":
    image_dir = 'assets/images/image_bar/'
    output_file = '_data/image_bar.yml'

    collect_images(image_dir, output_file)
