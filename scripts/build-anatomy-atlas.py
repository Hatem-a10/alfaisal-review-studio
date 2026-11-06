"""Build licensed atlas assets from work/anatomy-atlas and the BodyParts3D ISA archive."""
import collections
import gzip
import json
import re
import struct
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

work = Path('work/anatomy-atlas')
output = Path('public/anatomy-models')
output.mkdir(exist_ok=True)
credit = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'
airway = ['FMA7394', 'FMA26661', 'FMA26662']


def unpack(data):
    size = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + size]), data[28 + size:]


def pack(doc, binary):
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    return (struct.pack('<4sIIII', b'glTF', 2, 28 + len(encoded) + len(binary), len(encoded), 0x4e4f534a)
            + encoded + struct.pack('<II', len(binary), 0x004e4942) + binary)


def geometry(archive, file):
    prefix = archive.namelist()[0].split('/')[0]
    vertices, faces = [], []
    for line in archive.read(f'{prefix}/{file}.obj').splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == b'v':
            vertices.append(list(map(float, parts[1:4])))
        elif parts[0] == b'f':
            indices = [int(item.split(b'/')[0]) - 1 for item in parts[1:]]
            faces.extend((indices[0], indices[i], indices[i + 1]) for i in range(1, len(indices) - 1))
    xyz = np.asarray(vertices, dtype='<f4')
    xyz = xyz[:, [0, 2, 1]] * [1, 1, -1]
    faces = np.asarray(faces, dtype='<u4')
    if file.rstrip('M') in {'FJ1451', 'FJ1454', 'FJ1455'}:
        # Weld the unusually dense muscle meshes on a 2 mm grid for mobile.
        _, cells, lookup, counts = np.unique(np.round(xyz / 2), axis=0, return_index=True,
                                            return_inverse=True, return_counts=True)
        points = np.zeros((len(cells), 3))
        np.add.at(points, lookup, xyz)
        xyz = points / counts[:, None]
        faces = lookup[faces].astype('<u4')
        distinct = (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
        faces = faces[distinct]
    return xyz, faces


def anatomical_model(entries, archive):
    doc = dict(asset={'version': '2.0', 'copyright': credit}, scene=0, scenes=[{'nodes': []}],
               nodes=[], meshes=[], materials=[], buffers=[], bufferViews=[], accessors=[])
    binary = bytearray()

    def accessor(values, kind, component, bounds=False):
        doc['bufferViews'].append(dict(buffer=0, byteOffset=len(binary), byteLength=values.nbytes))
        binary.extend(values.tobytes())
        row = dict(bufferView=len(doc['bufferViews']) - 1, componentType=component, count=len(values), type=kind)
        if bounds:
            row.update(min=values.min(axis=0).tolist(), max=values.max(axis=0).tolist())
        doc['accessors'].append(row)
        return len(doc['accessors']) - 1

    parts = []
    for name, files, color in entries:
        vertices, triangles = [], []
        offset = 0
        for file in files:
            xyz, faces = geometry(archive, file)
            vertices.append(xyz)
            triangles.append(faces + offset)
            offset += len(xyz)
        parts.append((name, np.concatenate(vertices), np.concatenate(triangles), color))
    points = np.concatenate([p[1] for p in parts])
    low, high = points.min(axis=0), points.max(axis=0)
    for name, xyz, faces, color in parts:
        xyz = ((xyz - (low + high) / 2) / max(high - low) * 3).astype('<f4')
        normals = np.zeros_like(xyz)
        vectors = np.cross(xyz[faces[:, 1]] - xyz[faces[:, 0]], xyz[faces[:, 2]] - xyz[faces[:, 0]])
        for i in range(3):
            np.add.at(normals, faces[:, i], vectors)
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
        idx = len(doc['nodes'])
        doc['nodes'].append(dict(name=name, mesh=idx))
        doc['scenes'][0]['nodes'].append(idx)
        doc['materials'].append(dict(pbrMetallicRoughness=dict(baseColorFactor=[*color, 1], metallicFactor=0, roughnessFactor=.8)))
        doc['meshes'].append(dict(name=name, primitives=[dict(attributes=dict(POSITION=accessor(xyz, 'VEC3', 5126, True),
                        NORMAL=accessor(normals, 'VEC3', 5126)), indices=accessor(faces.reshape(-1), 'SCALAR', 5125), material=idx)]))
    doc['buffers'].append(dict(byteLength=len(binary)))
    return pack(doc, binary)


def thumbnail(raw, key, only=None):
    doc, binary = unpack(raw)
    if key == 'diaphragm':
        only = {'right-hemidiaphragm', 'left-hemidiaphragm', 'esophagus', 'inferior-vena-cava', 'descending-aorta'}
    elif key == 'ribcage':
        only = {node['name'] for node in doc['nodes']
                if 'intercostal' not in node['name'] and 'cervical' not in node['name']
                and node['name'] not in {'atlas', 'axis'}}
    elif key == 'nose':
        only = {'nasal-bones', 'lateral-cartilages', 'alar-cartilages', 'septal-cartilage', 'vomer',
                'inferior-conchae', 'frontal-sinuses', 'anterior-ethmoid-cells', 'middle-ethmoid-cells',
                'posterior-ethmoid-cells', 'maxillary-sinuses', 'sphenoid-sinus'}

    def values(idx):
        a = doc['accessors'][idx]
        b = doc['bufferViews'][a['bufferView']]
        dtype = np.dtype({5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']])
        count = {'VEC3': 3, 'SCALAR': 1}[a['type']]
        # Some GLBs interleave POSITION and NORMAL in the same buffer view.
        stride = b.get('byteStride', count * dtype.itemsize)
        offset = b.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.ndarray((a['count'], count), dtype=dtype, buffer=binary,
                          offset=offset, strides=(stride, dtype.itemsize))

    yaw = {'nose': .70, 'diaphragm': .30, 'pharynx': 2.65}.get(key, -.30)
    pitch = {'diaphragm': .85}.get(key, .14)
    forward = np.array([np.sin(yaw)*np.cos(pitch), np.sin(pitch), np.cos(yaw)*np.cos(pitch)])
    right = np.cross([0, 1, 0], forward)
    right /= np.linalg.norm(right)
    up = np.cross(forward, right)
    basis = np.stack([right, -up, forward], axis=1)
    triangles, colors = [], []
    for node in doc['nodes']:
        if 'mesh' not in node or (only and node['name'] not in only):
            continue
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            xyz = values(primitive['attributes']['POSITION']) @ basis
            tris = xyz[values(primitive['indices']).reshape(-1, 3)]
            normal = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
            normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-12)
            light = .50 + .50 * np.abs(normal @ [-.32, -.44, .84])
            material = doc['materials'][primitive.get('material', 0)]
            color = material.get('pbrMetallicRoughness', {}).get('baseColorFactor', [.8,.35,.4,1])[:3]
            colors.extend(np.clip(np.power(np.array(color), .65) * light[:,None] * 255 + 12, 0, 255).astype('uint8'))
            triangles.extend(tris)
    tris = np.asarray(triangles)
    depth = tris[:, :, 2].mean(axis=1)
    xy = tris[:, :, :2]
    low, high = xy.min(axis=(0,1)), xy.max(axis=(0,1))
    size = np.array([840, 450])
    xy = (xy - (low + high)/2) * min((size - [44,24]) / np.maximum(high-low, 1e-12)) + size/2
    image = Image.new('RGBA', tuple(size))
    draw = ImageDraw.Draw(image)
    for i in depth.argsort():
        draw.polygon(xy[i].ravel().tolist(), fill=tuple(colors[i]) + (255,))
    image.resize((560, 300), Image.Resampling.LANCZOS).save(output / f'{key}.webp', quality=86)


def save(key, raw, names=None):
    doc, _ = unpack(raw)
    labels = {n['name']: (names or {}).get(n['name'], n['name'].replace('-', ' ').capitalize())
              for n in doc['nodes'] if 'mesh' in n}
    # Round only vertex attributes, retaining topology and all source labels.
    _, binary = unpack(raw)
    binary = bytearray(binary)
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            for kind in ('POSITION', 'NORMAL'):
                a = doc['accessors'][primitive['attributes'][kind]]
                b = doc['bufferViews'][a['bufferView']]
                if a['componentType'] != 5126 or b.get('byteStride', 12) != 12:
                    continue
                values = np.frombuffer(binary, dtype='<f4', count=a['count'] * 3,
                                       offset=b.get('byteOffset', 0) + a.get('byteOffset', 0))
                scale = 2 ** (14 - int(np.floor(np.log2(max(np.abs(values).max(), 1e-6))))) if kind == 'POSITION' else 1024
                values[:] = np.round(values * scale) / scale
                if 'min' in a:
                    a['min'] = values.reshape(-1, 3).min(axis=0).tolist()
                    a['max'] = values.reshape(-1, 3).max(axis=0).tolist()
    (output / f'{key}.glb.gz').write_bytes(gzip.compress(pack(doc, binary), compresslevel=9, mtime=0))
    thumbnail(raw, key)
    return labels


if sys.argv[1:] == ['--previews-only']:
    for key in ['lungs', 'nose', 'larynx', 'diaphragm', 'pharynx']:
        raw = gzip.decompress((output / f'{key}.glb.gz').read_bytes())
        thumbnail(raw, key)
        if key == 'lungs':
            thumbnail(raw, 'airway', airway)
    sys.exit()


labels = {}
for key in ['lungs', 'nose', 'larynx', 'diaphragm', 'pharynx']:
    raw = (work / f'{key}.glb').read_bytes()
    names = {}
    if key == 'lungs':
        names = {s['id']: s['name'] for s in json.loads((work / 'lungs.manifest.json').read_text())['structures']}
        thumbnail(raw, 'airway', airway)
    labels[key] = save(key, raw, names)
    (output / f'{key}-credits.txt').write_bytes((work / f'{key}.credit').read_bytes())

mapping = collections.defaultdict(set)
for line in (work / 'isa_element_parts.txt').read_text().splitlines():
    fields = line.split('\t')
    if len(fields) == 3:
        mapping[fields[1].lower()].add(fields[2])
bone = (.75,.60,.44)
cartilage = (.28,.60,.67)
names = [name for name in mapping if re.fullmatch(r'(right|left) \w+ (rib|costal cartilage)', name)]
ordinals = 'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth'.split()
vertebrae = {'atlas': 'C1 · Atlas', 'axis': 'C2 · Axis'}
vertebrae.update({f'{name} cervical vertebra': f'C{i} · {name.title()} cervical vertebra'
                  for i, name in enumerate(ordinals[2:7], 3)})
vertebrae.update({f'{name} thoracic vertebra': f'T{i} · {name.title()} thoracic vertebra'
                  for i, name in enumerate(ordinals, 1)})
names += ['manubrium', 'body of sternum', 'xiphoid process', *vertebrae]
ribcage = [(name, cartilage if 'cartilage' in name else bone) for name in names]
muscles = {'external intercostal muscle': (.76,.28,.21), 'internal intercostal muscle': (.62,.25,.41),
           'innermost intercostal muscle': (.49,.29,.57)}
ribcage += list(muscles.items())
red, blue, tan = (.72,.22,.24), (.25,.37,.72), (.66,.47,.31)
mediastinum = [(name, red) for name in ['ascending aorta', 'arch of aorta', 'descending thoracic aorta',
              'brachiocephalic artery', 'left common carotid artery', 'left subclavian artery']]
mediastinum += [(name, blue) for name in ['superior vena cava', 'left brachiocephalic vein',
                 'right brachiocephalic vein', 'azygos vein', 'pulmonary trunk']]
mediastinum += [('trachea', cartilage), ('esophagus', tan)]
with zipfile.ZipFile(sys.argv[1]) as archive:
    available = {Path(name).stem for name in archive.namelist()}
    for key, entries in [('ribcage', ribcage), ('mediastinum', mediastinum)]:
        parts = [(name.replace(' ', '-'), sorted(mapping[name] & available), color) for name, color in entries]
        assert all(files for _, files, _ in parts), [name for name, files, _ in parts if not files]
        names = {name.replace(' ', '-'): label for name, label in vertebrae.items()} if key == 'ribcage' else None
        labels[key] = save(key, anatomical_model(parts, archive), names)
thumbnail(Path(sys.argv[2]).read_bytes(), 'heart', {
    'right-atrium','left-atrium','ventricular-wall','ascending-aorta','aortic-arch',
    'pulmonary-trunk','superior-vena-cava','left-coronary','right-coronary','lad','circumflex'})
(output / 'structures.json').write_text(json.dumps(labels, ensure_ascii=False, separators=(',', ':'))+'\n')
