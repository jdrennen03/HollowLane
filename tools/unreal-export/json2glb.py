# Packs one of the game's models (assets/<name>.json: glTF JSON with its buffer inlined as base64, plus <name>-N.jpg/png
# images beside it) back into a single self-contained .glb for importing elsewhere.
#   usage: python3 json2glb.py assets/<name>.json out/<name>.glb
import base64, json, os, struct, sys
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src)); here = os.path.dirname(src)
bins = []
for b in d['buffers']:
    u = b.pop('uri', None)
    if u and u.startswith('data:'): bins.append(base64.b64decode(u.split(',', 1)[1]))
    elif u: bins.append(open(os.path.join(here, u), 'rb').read())
    else: bins.append(b'')
# one binary chunk: the buffers one after another, then every image as its own buffer view
blob = bytearray(); offs = []
for b in bins: offs.append(len(blob)); blob += b; blob += b'\0' * ((-len(blob)) % 4)
for bv in d.get('bufferViews', []): bv['byteOffset'] = bv.get('byteOffset', 0) + offs[bv.get('buffer', 0)]; bv['buffer'] = 0
for im in d.get('images', []):
    u = im.pop('uri', None)
    if u is None: continue
    raw = base64.b64decode(u.split(',', 1)[1]) if u.startswith('data:') else open(os.path.join(here, u), 'rb').read()
    im['mimeType'] = im.get('mimeType') or ('image/png' if raw[:4] == b'\x89PNG' else 'image/jpeg')
    d.setdefault('bufferViews', []).append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(raw)}); im['bufferView'] = len(d['bufferViews']) - 1
    blob += raw; blob += b'\0' * ((-len(blob)) % 4)
d['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(d, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
