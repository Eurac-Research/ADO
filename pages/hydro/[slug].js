import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, { Source, Layer, ScaleControl, NavigationControl } from 'react-map-gl'
import ControlPanel from '../../components/ControlPanel'
import { updatePercentiles } from '../../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from "../../components/layout"
import Header from "../../components/Header"
import TimeSeries from "../../components/timeseries"


const MAPBOX_TOKEN = 'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'

import {
  LineChart,
  Line,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts'


const indices = ['spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12', 'spi-1', 'spi-3', 'spi-6', 'spi-12', 'sspi-10', 'cdi', 'sma', 'vci', 'vhi']


export async function getStaticProps({ params }) {
  const datatype = params.slug ? params.slug.toUpperCase() : 'SPEI-1'

  const fetchStations = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/${datatype}-latest.geojson`)
  const stationData = await fetchStations.json()

  /*
  const stationData = {
    "type": "FeatureCollection",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": [
      { "type": "Feature", "properties": { "id_station": "ADO_DSC_AT12_0280", "CDI": { "2020-02-23": 0, "2020-02-24": 0, "2020-02-25": 0, "2020-02-26": 0, "2020-02-27": 0, "2020-02-28": 0, "2020-02-29": 0, "2020-03-01": 0, "2020-03-02": 0, "2020-03-03": 0, "2020-03-04": 0, "2020-03-05": 0, "2020-03-06": 0, "2020-03-07": 0, "2020-03-08": 0, "2020-03-09": 0, "2020-03-10": 0, "2020-03-11": 0, "2020-03-12": 0, "2020-03-13": 0, "2020-03-14": 0, "2020-03-15": 0, "2020-03-16": 0, "2020-03-17": 0, "2020-03-18": 0, "2020-03-19": 0, "2020-03-20": 0, "2020-03-21": 0, "2020-03-22": 0, "2020-03-23": 0 }, "id": 280, "country": "Austria", "region": "Niederösterreich", "location_s": "Kienstock", "lat": 48.38228215, "lon": 15.46258165, "coordinates": [48.38228215, 15.46258165], "start_date": "1978-01-01 00:00:00", "end_date": "2016-12-31 00:00:00", "watercours": "Donau", "height_mas": 194.0, "catchment_": 95970.0, "source_id": "207357", "note_influ": null, "point_geometry": "POINT (15.462581650000006 48.382282146454756)" }, "geometry": { "type": "MultiPolygon", "coordinates": [[[[9.82739, 46.35376], [9.78074, 46.33656], [9.76387, 46.33833], [9.74304, 46.35179], [9.72598, 46.38957], [9.6817, 46.41106], [9.66351, 46.41101], [9.66475, 46.42092], [9.70232, 46.43994], [9.71922, 46.43999], [9.73215, 46.45443], [9.72797, 46.50845], [9.69801, 46.51377], [9.69394, 46.54168], [9.71738, 46.54264], [9.73945, 46.55711], [9.84884, 46.57263], [9.83708, 46.58071], [9.83705, 46.59332], [9.86439, 46.60416], [9.87087, 46.62038], [9.88652, 46.6222], [9.89823, 46.63842], [9.86427, 46.65279], [9.87464, 46.68432], [9.88901, 46.68073], [9.90988, 46.69246], [9.9569, 46.69519], [9.95818, 46.7222], [9.9438, 46.7249], [9.93725, 46.7438], [9.94771, 46.74111], [9.966, 46.75552], [9.99869, 46.79334], [10.03664, 46.79153], [10.0432, 46.80954], [10.06284, 46.81403], [10.09301, 46.84912], [10.10478, 46.84101], [10.14409, 46.84907], [10.14154, 46.87248], [10.11405, 46.88782], [10.09575, 46.91935], [10.09708, 46.92745], [10.12466, 46.94093], [10.14179, 46.96701], [10.14184, 46.98592], [10.15895, 46.9985], [10.12485, 47.02015], [10.14988, 47.03993], [10.13289, 47.08226], [10.16195, 47.11823], [10.18697, 47.11909], [10.19359, 47.12988], [10.22127, 47.13523], [10.22135, 47.15414], [10.18448, 47.15961], [10.14229, 47.15247], [10.11204, 47.17681], [10.07777, 47.17594], [10.07906, 47.16153], [10.05797, 47.15615], [10.03559, 47.17326], [10.02636, 47.16426], [10.01054, 47.16876], [10.00659, 47.15526], [9.96441, 47.17146], [9.98155, 47.17867], [9.9855, 47.18947], [10.00791, 47.18317], [10.01583, 47.20747], [10.04221, 47.20927], [10.05674, 47.23086], [10.12931, 47.2299], [10.14386, 47.24519], [10.13073, 47.27131], [10.103, 47.27314], [10.07795, 47.29746], [10.08458, 47.31276], [10.07007, 47.33077], [10.07141, 47.34697], [10.07671, 47.35327], [10.10052, 47.35325], [10.10186, 47.36405], [10.11379, 47.37574], [10.12967, 47.37662], [10.13102, 47.38472], [10.14954, 47.3847], [10.13897, 47.38921], [10.13372, 47.40812], [10.14436, 47.42341], [10.17479, 47.41527], [10.17486, 47.43417], [10.13656, 47.47923], [10.118, 47.47835], [10.10609, 47.49006], [10.07957, 47.49548], [10.14991, 47.51071], [10.17522, 47.54307], [10.15267, 47.54671], [10.0836, 47.52788], [10.07832, 47.54049], [10.05708, 47.5405], [10.03054, 47.55581], [10.02656, 47.57201], [10.06509, 47.5801], [10.08899, 47.57018], [10.1767, 47.58807], [10.17683, 47.62407], [10.22209, 47.63749], [10.23017, 47.65907], [10.21027, 47.67351], [10.22499, 47.69238], [10.18774, 47.70055], [10.13844, 47.68623], [10.10783, 47.68986], [10.09454, 47.70427], [10.10257, 47.72227], [10.09327, 47.73757], [10.05864, 47.7484], [10.01865, 47.73851], [10.01866, 47.75561], [10.00133, 47.76101], [10.004, 47.77181], [9.98266, 47.79881], [9.95464, 47.797], [9.90399, 47.77447], [9.90929, 47.79607], [9.89859, 47.80956], [9.91594, 47.81048], [9.92792, 47.82938], [9.91057, 47.82937], [9.90387, 47.84286], [9.88783, 47.84825], [9.81307, 47.84365], [9.79969, 47.84992], [9.78081, 47.89398], [9.78199, 47.92998], [9.79398, 47.9426], [9.78193, 47.94348], [9.77785, 47.95877], [9.73512, 47.94067], [9.7096, 47.95951], [9.69487, 47.96037], [9.69478, 47.97566], [9.7095, 47.9766], [9.72541, 48.00544], [9.68646, 48.02243], [9.65296, 48.02323], [9.63166, 48.00427], [9.62384, 47.97454], [9.60766, 47.98978], [9.55932, 48.0049], [9.47534, 47.96584], [9.45577, 47.91805], [9.49479, 47.89394], [9.50177, 47.86337], [9.48724, 47.84711], [9.44964, 47.86582], [9.44817, 47.87841], [9.42688, 47.87111], [9.40143, 47.87637], [9.38819, 47.8664], [9.40851, 47.84221], [9.39669, 47.82505], [9.32666, 47.87234], [9.30413, 47.8587], [9.25153, 47.89345], [9.24049, 47.91677], [9.17364, 47.91629], [9.15117, 47.90082], [9.14492, 47.87467], [9.12227, 47.87089], [9.11144, 47.8789], [9.06057, 47.88388], [9.05626, 47.90004], [9.04418, 47.90264], [9.05453, 47.92163], [9.04502, 47.92964], [8.99803, 47.93822], [8.99159, 47.92557], [8.97038, 47.91637], [8.96201, 47.93339], [8.92588, 47.93394], [8.89475, 47.95073], [8.88013, 47.94609], [8.88705, 47.93536], [8.8512, 47.92329], [8.80419, 47.93179], [8.77796, 47.9099], [8.76157, 47.92411], [8.73891, 47.92116], [8.74174, 47.91489], [8.72585, 47.90841], [8.72648, 47.88321], [8.69867, 47.87299], [8.71366, 47.86146], [8.63296, 47.83169], [8.60947, 47.81159], [8.58813, 47.81132], [8.55958, 47.82985], [8.53951, 47.83138], [8.56149, 47.85687], [8.54609, 47.88187], [8.51379, 47.88954], [8.4873, 47.88108], [8.46828, 47.89161], [8.43899, 47.8876], [8.41683, 47.91249], [8.38304, 47.92369], [8.36304, 47.9216], [8.31295, 47.93974], [8.24723, 47.94411], [8.22776, 47.9654], [8.19663, 47.9748], [8.19188, 47.99542], [8.20317, 48.01721], [8.17871, 48.0267], [8.17611, 48.06176], [8.14943, 48.09462], [8.17731, 48.10318], [8.19127, 48.08811], [8.23445, 48.08161], [8.25538, 48.09725], [8.27938, 48.10213], [8.27508, 48.11016], [8.29219, 48.12032], [8.29961, 48.13934], [8.33583, 48.14079], [8.33554, 48.14979], [8.35954, 48.15555], [8.40063, 48.13095], [8.41355, 48.10414], [8.44019, 48.11082], [8.44882, 48.09204], [8.46769, 48.08961], [8.48494, 48.09614], [8.50803, 48.08656], [8.49926, 48.06574], [8.4807, 48.05829], [8.49949, 48.05765], [8.49434, 48.05038], [8.52554, 48.0382], [8.56278, 48.04859], [8.57497, 48.04425], [8.56989, 48.03428], [8.61413, 48.03395], [8.60982, 48.04469], [8.62549, 48.06019], [8.65652, 48.05337], [8.68161, 48.06808], [8.70873, 48.0567], [8.75176, 48.0518], [8.77282, 48.06823], [8.75996, 48.10048], [8.77334, 48.10243], [8.76621, 48.11945], [8.78087, 48.12411], [8.77531, 48.13215], [8.7498, 48.13186], [8.74282, 48.14258], [8.75591, 48.15623], [8.79242, 48.14674], [8.80033, 48.15312], [8.79455, 48.17016], [8.80526, 48.17207], [8.82345, 48.14077], [8.8355, 48.1427], [8.85127, 48.15816], [8.83891, 48.16973], [8.84944, 48.17974], [8.84518, 48.1896], [8.87202, 48.19167], [8.88378, 48.20709], [8.89893, 48.19105], [8.90949, 48.20015], [8.92858, 48.18774], [8.94457, 48.19419], [8.94627, 48.17711], [8.9571, 48.17361], [8.97312, 48.17916], [8.97161, 48.18725], [8.99048, 48.18472], [9.00647, 48.19207], [9.009, 48.20019], [8.98736, 48.20629], [8.99909, 48.22529], [8.99296, 48.26303], [8.97937, 48.2692], [8.98048, 48.28091], [8.95869, 48.2924], [8.96127, 48.29783], [8.99339, 48.30892], [9.037, 48.28322], [9.04156, 48.25626], [9.06711, 48.25738], [9.06558, 48.26727], [9.10272, 48.29907], [9.10373, 48.31797], [9.1213, 48.31541], [9.15067, 48.33184], [9.15969, 48.3571], [9.17994, 48.35635], [9.16477, 48.37603], [9.1714, 48.38328], [9.15503, 48.39395], [9.14428, 48.39117], [9.14144, 48.39925], [9.19253, 48.41223], [9.21174, 48.39257], [9.26435, 48.39473], [9.28029, 48.41283], [9.2827, 48.43354], [9.31377, 48.43374], [9.29179, 48.45969], [9.32682, 48.468], [9.317, 48.49404], [9.33324, 48.49323], [9.3402, 48.47798], [9.39979, 48.47022], [9.41491, 48.44871], [9.41376, 48.43161], [9.43125, 48.438], [9.45698, 48.43183], [9.46926, 48.4202], [9.48132, 48.42925], [9.5192, 48.42312], [9.54057, 48.4493], [9.58106, 48.45576], [9.57824, 48.46925], [9.53893, 48.48079], [9.55209, 48.52132], [9.57372, 48.52411], [9.59272, 48.51788], [9.59803, 48.5305], [9.61024, 48.52604], [9.64132, 48.53334], [9.66154, 48.546], [9.68461, 48.53617], [9.73728, 48.5597], [9.7631, 48.53997], [9.8281, 48.53559], [9.82664, 48.56617], [9.84154, 48.5653], [9.88886, 48.60044], [9.91598, 48.59417], [9.92546, 48.59867], [9.90917, 48.61215], [9.90506, 48.63824], [9.94166, 48.65086], [9.92536, 48.66524], [9.90907, 48.66793], [9.91992, 48.67243], [9.91312, 48.68322], [9.9294, 48.68413], [9.92123, 48.70572], [9.93073, 48.71112], [9.89671, 48.73718], [9.91299, 48.75339], [9.9089, 48.76328], [9.94153, 48.7624], [9.95784, 48.7741], [9.97688, 48.76421], [9.98096, 48.78041], [10.03265, 48.7831], [10.09787, 48.74438], [10.1142, 48.75336], [10.12506, 48.74885], [10.15645, 48.7866], [10.15103, 48.7956], [10.16738, 48.80187], [10.1756, 48.81715], [10.15797, 48.83967], [10.14301, 48.84418], [10.15259, 48.86036], [10.23434, 48.86202], [10.24522, 48.8566], [10.28479, 48.8691], [10.27672, 48.88711], [10.30411, 48.90773], [10.29739, 48.92393], [10.31795, 48.94007], [10.29767, 48.97161], [10.29915, 48.98959], [10.25547, 48.996], [10.24326, 49.01311], [10.19956, 49.02219], [10.19553, 49.03929], [10.21479, 49.06714], [10.19163, 49.09236], [10.1917, 49.10945], [10.14382, 49.12482], [10.13295, 49.15901], [10.15627, 49.16347], [10.1714, 49.17784], [10.15637, 49.19405], [10.13992, 49.19767], [10.17707, 49.23], [10.16889, 49.2462], [10.19506, 49.26504], [10.23631, 49.27486], [10.24186, 49.28474], [10.27344, 49.28017], [10.26946, 49.30626], [10.24341, 49.31981], [10.26005, 49.34585], [10.27245, 49.34942], [10.25053, 49.36926], [10.24513, 49.38906], [10.26867, 49.41239], [10.26457, 49.41959], [10.2742, 49.41687], [10.28943, 49.42852], [10.3115, 49.43116], [10.33073, 49.42211], [10.3666, 49.4265], [10.36514, 49.41661], [10.4173, 49.39215], [10.41714, 49.37416], [10.40745, 49.3679], [10.43074, 49.35522], [10.42925, 49.34174], [10.4567, 49.33534], [10.4566, 49.32364], [10.48262, 49.31274], [10.47828, 49.29118], [10.51123, 49.28743], [10.53434, 49.26394], [10.5631, 49.25661], [10.56296, 49.24492], [10.57532, 49.24485], [10.57956, 49.25472], [10.63167, 49.24905], [10.6411, 49.2346], [10.65479, 49.23183], [10.66801, 49.19487], [10.69123, 49.18754], [10.70326, 49.16588], [10.71974, 49.16757], [10.72964, 49.18819], [10.75013, 49.18266], [10.77771, 49.19237], [10.78166, 49.18155], [10.79531, 49.17785], [10.79241, 49.16798], [10.81142, 49.15705], [10.79065, 49.14371], [10.80971, 49.13637], [10.81495, 49.12195], [10.87763, 49.10348], [10.91006, 49.07984], [10.89796, 49.01697], [10.91841, 49.01411], [10.92629, 48.99695], [10.90975, 48.98899], [10.92747, 48.98705], [10.93275, 48.97711], [10.98477, 48.98296], [10.99172, 48.98919], [10.96885, 49.00738], [11.01269, 49.01239], [11.02079, 49.00782], [11.02259, 49.02849], [11.05406, 49.03], [11.07398, 49.06579], [11.11674, 49.08067], [11.10376, 49.11228], [11.13121, 49.1147], [11.14235, 49.12269], [11.15174, 49.11449], [11.15739, 49.12163], [11.22988, 49.11726], [11.25483, 49.12868], [11.26239, 49.15648], [11.24146, 49.19629], [11.26208, 49.19786], [11.27352, 49.21572], [11.26885, 49.24726], [11.27874, 49.25794], [11.26817, 49.27425], [11.28345, 49.28037], [11.27672, 49.28584], [11.2838, 49.29386], [11.30304, 49.29364], [11.30051, 49.30176], [11.31449, 49.31059], [11.33912, 49.30581], [11.33254, 49.31668], [11.34241, 49.32556], [11.36591, 49.32977], [11.38631, 49.32143], [11.37056, 49.29913], [11.39318, 49.27277], [11.4272, 49.26155], [11.42935, 49.24083], [11.43505, 49.24795], [11.44867, 49.24418], [11.47085, 49.25109], [11.50361, 49.24436], [11.51779, 49.25856], [11.48796, 49.27155], [11.53517, 49.28711], [11.52594, 49.29983], [11.53999, 49.30953], [11.53063, 49.31775], [11.54449, 49.32116], [11.54059, 49.32841], [11.56431, 49.33888], [11.56741, 49.34963], [11.55259, 49.35973], [11.52788, 49.36187], [11.53819, 49.38332], [11.51664, 49.3989], [11.51826, 49.40697], [11.5403, 49.40667], [11.57379, 49.4197], [11.59003, 49.41048], [11.608, 49.41202], [11.62492, 49.42347], [11.65802, 49.42389], [11.67094, 49.43899], [11.66417, 49.44269], [11.67174, 49.46237], [11.66209, 49.46251], [11.66653, 49.47144], [11.64894, 49.48159], [11.66611, 49.49933], [11.63332, 49.5097], [11.6532, 49.5256], [11.64104, 49.53388], [11.64972, 49.54544], [11.63171, 49.54391], [11.62498, 49.5494], [11.64705, 49.54818], [11.66808, 49.55687], [11.68862, 49.55117], [11.69443, 49.55917], [11.68802, 49.57366], [11.65767, 49.57591], [11.64717, 49.59225], [11.61972, 49.59895], [11.6347, 49.63291], [11.66527, 49.63606], [11.65887, 49.65145], [11.6286, 49.65728], [11.62755, 49.66719], [11.68187, 49.67539], [11.67525, 49.68448], [11.70217, 49.70117], [11.71128, 49.72352], [11.69773, 49.73272], [11.68242, 49.73115], [11.69105, 49.74001], [11.67038, 49.74392], [11.68897, 49.75983], [11.68279, 49.78151], [11.64025, 49.79652], [11.66003, 49.80613], [11.65904, 49.81783], [11.67444, 49.82121], [11.68793, 49.80931], [11.7039, 49.82886], [11.72865, 49.82129], [11.74826, 49.82549], [11.75421, 49.83619], [11.72855, 49.85727], [11.76927, 49.86744], [11.77383, 49.87816], [11.73952, 49.89128], [11.75243, 49.90187], [11.73328, 49.91116], [11.76724, 49.92593], [11.78545, 49.96611], [11.82257, 49.98891], [11.83022, 50.00677], [11.82404, 50.02756], [11.84898, 50.02266], [11.87583, 50.03122], [11.91489, 49.99549], [11.98154, 49.98805], [12.00042, 49.97243], [11.99598, 49.96621], [12.03001, 49.94672], [12.03687, 49.91152], [12.08017, 49.91433], [12.08493, 49.92774], [12.10009, 49.92386], [12.13732, 49.94656], [12.17836, 49.92959], [12.2202, 49.93058], [12.24319, 49.94542], [12.29616, 49.91647], [12.32534, 49.91498], [12.3453, 49.89568], [12.36351, 49.898], [12.38258, 49.88951], [12.40089, 49.89362], [12.41447, 49.85915], [12.4433, 49.85133], [12.4546, 49.85469], [12.45655, 49.83845], [12.48179, 49.81541], [12.46323, 49.80592], [12.44891, 49.77025], [12.46995, 49.77429], [12.49358, 49.74768], [12.52375, 49.74072], [12.56439, 49.7479], [12.67841, 49.67598], [12.67776, 49.6643], [12.657, 49.66479], [12.66713, 49.64746], [12.65878, 49.62156], [12.66505, 49.60972], [12.60847, 49.56155], [12.62279, 49.54503], [12.63527, 49.54563], [12.62863, 49.5251], [12.65189, 49.52095], [12.65959, 49.48478], [12.70585, 49.49718], [12.71638, 49.48792], [12.71282, 49.47361], [12.73207, 49.47225], [12.78205, 49.42873], [12.78499, 49.38367], [12.80625, 49.39394], [12.81817, 49.38554], [12.84432, 49.38489], [12.86555, 49.37085], [12.95077, 49.39024], [12.95319, 49.38478], [12.99013, 49.38021], [12.99789, 49.3719], [13.05011, 49.3696], [13.09534, 49.34406], [13.10027, 49.33493], [13.06026, 49.31172], [13.06199, 49.29548], [13.02539, 49.28207], [13.0256, 49.26316], [13.05107, 49.25257], [13.06092, 49.2343], [13.11219, 49.21939], [13.1098, 49.20326], [13.16289, 49.17477], [13.24635, 49.17059], [13.25653, 49.1793], [13.27369, 49.16889], [13.28897, 49.13064], [13.33015, 49.09072], [13.32632, 49.07463], [13.33872, 49.05536], [13.3696, 49.04633], [13.39506, 49.05816], [13.40301, 49.05432], [13.38923, 49.03313], [13.40382, 49.02639], [13.40115, 49.00756], [13.42752, 48.99325], [13.41431, 48.98016], [13.42603, 48.97169], [13.4636, 48.96153], [13.49741, 48.93707], [13.50857, 48.94032], [13.50782, 48.96826], [13.54822, 48.97868], [13.57505, 48.97153], [13.59304, 48.97455], [13.60408, 48.95709], [13.65141, 48.95015], [13.63496, 48.93088], [13.65098, 48.92585], [13.63975, 48.92172], [13.63544, 48.90025], [13.65641, 48.86985], [13.69959, 48.84502], [13.67519, 48.82872], [13.68285, 48.80325], [13.71581, 48.80666], [13.778, 48.78206], [13.80273, 48.78482], [13.81814, 48.77258], [13.87105, 48.76985], [13.90002, 48.75714], [13.97783, 48.69134], [13.99965, 48.65813], [14.03116, 48.64439], [14.0554, 48.6417], [14.0736, 48.64824], [14.08634, 48.63787], [14.10183, 48.6445], [14.11471, 48.63592], [14.1354, 48.63965], [14.13843, 48.62693], [14.16078, 48.61799], [14.16935, 48.62307], [14.18665, 48.61882], [14.25143, 48.56591], [14.2672, 48.5599], [14.28787, 48.56361], [14.31283, 48.53832], [14.33581, 48.53742], [14.33085, 48.51149], [14.37547, 48.4791], [14.39064, 48.48211], [14.38331, 48.50672], [14.40276, 48.52757], [14.39377, 48.53334], [14.41874, 48.53955], [14.42494, 48.54831], [14.45237, 48.55172], [14.4698, 48.56453], [14.46146, 48.5928], [14.44563, 48.59794], [14.44515, 48.60787], [14.45829, 48.60284], [14.47644, 48.60841], [14.48368, 48.59821], [14.5125, 48.60155], [14.51854, 48.59319], [14.53732, 48.59062], [14.54757, 48.5839], [14.55061, 48.55764], [14.59046, 48.53348], [14.62077, 48.53852], [14.63223, 48.55967], [14.66645, 48.56274], [14.66018, 48.58283], [14.67268, 48.58591], [14.69763, 48.57675], [14.70912, 48.59788], [14.73965, 48.59028], [14.78607, 48.59279], [14.80446, 48.57217], [14.79006, 48.54936], [14.80614, 48.51893], [14.82631, 48.51715], [14.84671, 48.50364], [14.862, 48.50748], [14.87118, 48.47643], [14.91302, 48.47459], [14.94587, 48.46411], [14.94472, 48.45245], [14.96669, 48.42803], [14.95429, 48.42588], [14.96015, 48.4166], [14.9491, 48.41439], [14.95893, 48.39052], [14.98631, 48.3938], [15.03086, 48.37916], [15.03571, 48.38705], [15.05466, 48.38709], [15.06013, 48.37422], [15.08401, 48.36952], [15.07864, 48.38328], [15.10048, 48.3985], [15.15293, 48.39517], [15.20263, 48.40456], [15.20282, 48.38021], [15.21865, 48.36324], [15.26589, 48.38805], [15.28368, 48.3899], [15.31635, 48.41719], [15.34792, 48.40845], [15.38093, 48.41316], [15.39055, 48.40187], [15.41577, 48.40966], [15.4225, 48.3967], [15.46077, 48.38761], [15.47307, 48.37618], [15.46448, 48.35947], [15.47129, 48.34741], [15.45887, 48.3327], [15.47501, 48.3319], [15.47807, 48.32273], [15.53829, 48.31702], [15.5099, 48.29229], [15.50977, 48.27877], [15.60824, 48.22872], [15.60451, 48.20726], [15.56591, 48.18758], [15.57555, 48.17717], [15.59309, 48.17718], [15.58499, 48.16497], [15.59701, 48.12738], [15.58446, 48.12351], [15.58259, 48.10647], [15.55368, 48.10072], [15.56024, 48.08686], [15.54587, 48.07856], [15.55971, 48.06975], [15.55595, 48.06002], [15.53445, 48.0602], [15.52545, 48.05164], [15.5187, 48.02672], [15.53413, 48.00791], [15.49926, 47.99613], [15.49101, 47.96949], [15.46572, 47.95903], [15.43338, 47.95793], [15.42937, 47.93288], [15.38544, 47.9107], [15.39373, 47.90037], [15.3722, 47.89962], [15.37556, 47.86789], [15.4006, 47.86396], [15.42164, 47.87284], [15.42821, 47.84636], [15.46067, 47.84926], [15.49697, 47.81317], [15.48392, 47.79128], [15.48169, 47.75802], [15.43704, 47.75303], [15.42383, 47.74196], [15.39534, 47.73796], [15.39649, 47.72347], [15.42042, 47.70966], [15.39622, 47.70815], [15.39452, 47.692], [15.37858, 47.69279], [15.3709, 47.68325], [15.41218, 47.65686], [15.40508, 47.64007], [15.37466, 47.62985], [15.32785, 47.62854], [15.31658, 47.62277], [15.31615, 47.60566], [15.27001, 47.63676], [15.25551, 47.63836], [15.21432, 47.6268], [15.18353, 47.62557], [15.17753, 47.63216], [15.12344, 47.61127], [15.08895, 47.61288], [15.08143, 47.60422], [15.02961, 47.60572], [14.97385, 47.58032], [14.98284, 47.54925], [14.93285, 47.51366], [14.92725, 47.49678], [14.89189, 47.48845], [14.8602, 47.49077], [14.85026, 47.484], [14.82288, 47.48973], [14.79814, 47.4809], [14.76711, 47.49038], [14.70729, 47.49028], [14.69953, 47.47799], [14.71021, 47.46401], [14.69816, 47.4483], [14.67459, 47.45202], [14.65561, 47.433], [14.63137, 47.44395], [14.61261, 47.44204], [14.60092, 47.40017], [14.62039, 47.38041], [14.59232, 47.37799], [14.57761, 47.36148], [14.53837, 47.36764], [14.54042, 47.39099], [14.50854, 47.39051], [14.48148, 47.41507], [14.45076, 47.41272], [14.43107, 47.43065], [14.39861, 47.43918], [14.37702, 47.41932], [14.30366, 47.39881], [14.28793, 47.38501], [14.24226, 47.37779], [14.22479, 47.35864], [14.22598, 47.32434], [14.19534, 47.3057], [14.17034, 47.30757], [14.1521, 47.29474], [14.13905, 47.29704], [14.09927, 47.2625], [14.06305, 47.27288], [14.04716, 47.28969], [14.01341, 47.26391], [13.96898, 47.27095], [13.95545, 47.26694], [13.95325, 47.2553], [13.93161, 47.24888], [13.91578, 47.24945], [13.91139, 47.26132], [13.86311, 47.25224], [13.82447, 47.26622], [13.81867, 47.29526], [13.78779, 47.28913], [13.78978, 47.28005], [13.76096, 47.26573], [13.74861, 47.27788], [13.72348, 47.27784], [13.7129, 47.25928], [13.69576, 47.25986], [13.67699, 47.27492], [13.63062, 47.27377], [13.62201, 47.28307], [13.58199, 47.27809], [13.579, 47.25386], [13.55891, 47.25002], [13.55158, 47.23945], [13.53181, 47.24009], [13.52065, 47.23144], [13.48212, 47.22818], [13.45899, 47.21811], [13.43682, 47.22242], [13.3961, 47.20568], [13.37554, 47.21443], [13.35663, 47.20781], [13.31785, 47.15855], [13.33788, 47.14172], [13.33284, 47.12476], [13.3548, 47.09705], [13.30666, 47.08592], [13.29156, 47.09719], [13.27435, 47.09591], [13.2488, 47.08767], [13.23997, 47.07262], [13.24767, 47.04806], [13.16834, 47.0423], [13.1574, 47.03542], [13.13238, 47.03524], [13.12659, 47.0264], [13.08188, 47.02678], [13.07458, 47.01438], [13.0202, 47.02942], [13.01441, 47.0431], [12.98903, 47.03659], [12.96286, 47.03911], [12.93733, 47.07674], [12.9166, 47.08271], [12.84149, 47.082], [12.81991, 47.09698], [12.78543, 47.09247], [12.77402, 47.10087], [12.7384, 47.09997], [12.73512, 47.11266], [12.71552, 47.11586], [12.71199, 47.12405], [12.66837, 47.12153], [12.6729, 47.10701], [12.65144, 47.09943], [12.62476, 47.11899], [12.59213, 47.12518], [12.58849, 47.13158], [12.56497, 47.13574], [12.55269, 47.12702], [12.53965, 47.13003], [12.52091, 47.15118], [12.49878, 47.1571], [12.45205, 47.14465], [12.43386, 47.15047], [12.42164, 47.14264], [12.39703, 47.15219], [12.36354, 47.14032], [12.35375, 47.12792], [12.35693, 47.11074], [12.31722, 47.10619], [12.30737, 47.09199], [12.28907, 47.09508], [12.26442, 47.07309], [12.24307, 47.06633], [12.22535, 47.0829], [12.1889, 47.09265], [12.121, 47.07419], [12.09751, 47.07915], [12.07568, 47.05976], [12.04021, 47.06133], [12.02125, 47.04728], [11.97663, 47.0499], [11.9684, 47.04105], [11.91412, 47.03122], [11.83651, 46.99294], [11.7813, 46.99206], [11.74894, 46.96737], [11.72806, 46.97131], [11.71172, 46.99408], [11.66305, 46.99214], [11.6256, 47.01342], [11.538, 46.98409], [11.52649, 46.99505], [11.49386, 47.00271], [11.45284, 46.99247], [11.44321, 46.97639], [11.40613, 46.96517], [11.38133, 46.97089], [11.35953, 46.99098], [11.34096, 46.98401], [11.31752, 46.9924], [11.31076, 46.98438], [11.26206, 46.98045], [11.20781, 46.96307], [11.19879, 46.97037], [11.16453, 46.96534], [11.16531, 46.94102], [11.13877, 46.9278], [11.11393, 46.93166], [11.10967, 46.9164], [11.09515, 46.91204], [11.10257, 46.89036], [11.07174, 46.85735], [11.07003, 46.83756], [11.08279, 46.82122], [11.04058, 46.80543], [11.0228, 46.76598], [10.95105, 46.77654], [10.91964, 46.77591], [10.88019, 46.76364], [10.83861, 46.78108], [10.80704, 46.76961], [10.8072, 46.78042], [10.7865, 46.79588], [10.76017, 46.78526], [10.73012, 46.78817], [10.72634, 46.799], [10.74603, 46.80337], [10.76335, 46.82396], [10.75692, 46.8321], [10.69301, 46.85234], [10.69708, 46.86312], [10.66841, 46.87501], [10.65257, 46.8661], [10.59481, 46.85743], [10.56319, 46.84049], [10.51736, 46.84162], [10.49887, 46.8255], [10.46623, 46.83645], [10.44891, 46.80231], [10.42393, 46.78801], [10.44211, 46.77173], [10.44323, 46.74921], [10.42746, 46.73847], [10.41545, 46.7079], [10.38392, 46.68371], [10.40056, 46.63862], [10.38227, 46.63509], [10.37973, 46.6459], [10.36408, 46.64596], [10.3524, 46.6559], [10.33538, 46.64785], [10.31458, 46.66142], [10.31191, 46.65152], [10.29886, 46.65156], [10.28442, 46.63629], [10.29341, 46.60925], [10.35062, 46.58387], [10.35955, 46.55592], [10.33993, 46.54248], [10.32696, 46.55152], [10.29959, 46.5489], [10.28017, 46.57237], [10.2501, 46.55173], [10.20844, 46.55722], [10.20837, 46.54011], [10.22658, 46.53287], [10.21218, 46.51579], [10.21863, 46.50137], [10.19255, 46.48701], [10.19767, 46.46359], [10.16383, 46.45554], [10.1586, 46.44564], [10.10136, 46.42139], [10.07927, 46.42231], [10.07668, 46.42952], [10.06498, 46.42592], [10.0572, 46.44034], [10.0416, 46.44215], [10.04159, 46.43134], [10.02729, 46.42954], [10.03637, 46.39352], [9.98831, 46.38452], [9.97792, 46.38902], [9.97014, 46.37911], [9.94287, 46.3782], [9.9286, 46.36738], [9.89872, 46.38267], [9.87149, 46.36373], [9.84164, 46.36369], [9.82739, 46.35376]], [[9.93208, 48.71202], [9.93208, 48.71292], [9.93072, 48.71292], [9.93072, 48.71202], [9.93208, 48.71202]], [[13.28112, 49.15698], [13.27975, 49.15702], [13.27969, 49.15612], [13.28106, 49.15608], [13.28112, 49.15698]]], [[[9.90336, 46.68975], [9.90205, 46.68975], [9.90205, 46.69065], [9.90335, 46.69065], [9.90336, 46.68975]]], [[[12.67939, 49.49331], [12.68077, 49.49328], [12.68072, 49.49238], [12.67934, 49.49241], [12.67939, 49.49331]]]] } },
      {
        "type":
          "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [15.46258, 48.3822]
        }
      }
    ]
  }
  */



  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()



  /*   const fetchStations = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/CDI-latest.geojson`)
    const stationData = await fetchStations.json()
   */
  /*   const cachmentsGeoJson = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/catchment_polygons.geojson`)
    const cachmentsLayer = await cachmentsGeoJson.json()
   */

  return { props: { datatype, staticMetaData, stationData } };
}

// This function gets called at build time
export async function getStaticPaths() {
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: `${index}` },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: 'blocking' }
}



export default function App({ datatype, staticData, staticMetaData, cachmentsLayer, stationData, href }) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []
  const dataLayer = paint

  const stationGeometryLayer = paint

/*   const stationGeometryLayer = {
    id: 'stationGeometry',
    source: 'stationData',
    type: 'fill',
    paint: {
      'fill-color': "transparent",
      'fill-opacity': 1,
      'fill-outline-color': "red"
    },
    'filter': ['==', '$type', 'Polygon']
  }

 */  const stationPaintLayer = {
    id: 'stationPoint',
    type: 'circle',
    source: 'stationData',
    paint: {
      'circle-color': 'red',
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
    'filter': ['==', '$type', 'Point']
  }


  const [metaData, setMetaData] = useState()

  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.lastDate : staticMetaData?.timerange?.properties?.lastDate);

  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)

  const [htmlData, setHtmlData] = useState(null)
  const [timeseriesData, setTimeseriesData] = useState(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)



  const onHover = useCallback(event => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];
    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });

  }, []);

  const onOut = useCallback(event => {
    setHoverInfo(null)
  }, []);


  const onClick = useCallback(async (event) => {
    const {
      features
    } = event;
    const hoveredFeature = features && features[0];
    setClickInfo(
      hoveredFeature
        ? {
          feature: hoveredFeature
        }
        : null
    );
    const stationId = hoveredFeature ? hoveredFeature?.properties?.id_station : null
    getHtmlData(stationId)
  }, []);

  const onClose = useCallback(async (event) => {
    setClickInfo()
  }, []);



  /* https://www.zeromolecule.com/blog/5-utility-react-hooks-for-every-project/ */
  function useToggleState(
    initialState = false,
    [on, off] = ['dark', 'light']
  ) {
    const [state, setState] = useState(initialState);

    const toggleState = useCallback(() => {
      setState(s => (s === on ? off : on));
    }, [on, off]);

    return [state, toggleState, setState];
  }
  const [theme, toggleTheme] = useToggleState('light', ['dark', 'light']);

  const mapStationData = useMemo(() => {
    return stationData && updatePercentiles(stationData, f => f.properties[`${datatype}`][day]);
  }, [datatype, stationData, day]);

  const metadata = useMemo(() => {
    return staticMetaData;
  }, [staticMetaData]);

  async function getNutsData(overlayNutsId) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/timeseries/NUTS3_${overlayNutsId ? `${overlayNutsId}` : ''}.json`
        const result = await axios(url);
        setNutsData(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }

  async function getHtmlData(id_station) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        // const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_${id_station ? `${id_station}` : ''}.html`
        const htmlUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_ADO_DSC_ITC1_0037.html`
        const timeseriesUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/timeseries/ID_STATION_${id_station ? `${id_station}` : ''}.json`

        const result = await axios(htmlUrl)
        setHtmlData(result.data)

        const timeseriesResult = await axios(timeseriesUrl)
        setTimeseriesData(timeseriesResult.data)

      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }


  const scaleControlStyle = {
  };
  const navControlStyle = {
    right: 10,
    bottom: 120
  };

  return (
    <Layout theme={theme}>
      <Head>
        <title>{staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research</title>
      </Head>

      <Header />

      <div className="reactMap">
        <Map reuseMaps
          initialViewState={{
            latitude: 46,
            longitude: 9,
            minZoom: 5,
            zoom: 5,
            bearing: 0,
            pitch: 0
          }}
          style={{ width: "100vw", height: "100vh" }}
          mapStyle={theme === 'dark' ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy' : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'}
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >

          {/*             <Source type="geojson" data={stationData}>
              <Layer {...stationPaintLayer} />
            </Source>
 */}
          <Source type="geojson" data={mapStationData}>
            <Layer {...stationGeometryLayer} beforeId="waterway-shadow" />
          </Source>

          <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} position={"bottom-right"} />
          <NavigationControl style={navControlStyle} position={"bottom-right"} />

          {hoverInfo && (
            <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
              Click to open station details<br />
              station id: {hoverInfo?.feature?.properties?.id_station}
            </div>
          )}

        </Map>


        <div className="darkModeToggle" onClick={toggleTheme} title={theme === 'light' ? 'switch to dark mode' : "switch to light mode"}>
          {theme === 'light' ?
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" title="moon">
              <path d="M283.21 512c78.96 0 151.08-35.92 198.86-94.8 7.07-8.7-.64-21.42-11.56-19.34-124.2 23.65-238.27-71.58-238.27-196.96a200.43 200.43 0 0 1 101.5-174.39C343.43 21 341 6.31 330 4.28A258.16 258.16 0 0 0 283.2 0c-141.3 0-256 114.51-256 256 0 141.3 114.51 256 256 256z" />
            </svg>
            : <svg xmlns="http://www.w3.org/2000/svg" title="sun" fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          }
        </div>

      </div>

      {clickInfo && (
        <>
          <div className="overlayContainer" onClick={onClose}>
          </div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>close X</span>

            <TimeSeries data={timeseriesData} indices={indices} index={datatype} style={{ width: "100%", height: "100%", position: "relative", zIndex: "102", top: "0", left: "0" }} />
            {htmlData ?
              <iframe srcDoc={htmlData} width="100%" height="5500px" style={{ position: 'absolute', top: "auto", left: "0", height: "5500opx", width: "100%", paddingBottom: "150px" }}></iframe>
              : <>loading ...</>}

          </div>
        </>
      )}

      <div className="controlContainer">
        <div className="legend">
          {staticMetaData.colormap.legend.stops.map((item, index) => {
            return (
              <div key={`legend${index}`} className="legendItem">
                <div
                  className="legendColor"
                  style={{ background: item['2'] }}>
                </div>
                <p className="legendLabel">{item['1']}</p>
              </div>
            )
          })}
        </div>

        <ControlPanel
          metadata={metadata}
          day={day}
          firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''}
          lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''}
          onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))}
        />

        <div className="navigation">
          <p>Indices</p>
          <Link prefetch={false} href="/hydro/cdi">
            <a className={router.query.slug === 'cdi' ? 'active' : ''}>cdi</a>
          </Link>
          <Link prefetch={false} href="/hydro/vci">
            <a className={router.query.slug === 'vci' ? 'active' : ''}>vci</a>
          </Link>
          <Link prefetch={false} href="/hydro/vhi">
            <a className={router.query.slug === 'vhi' ? 'active' : ''}>vhi</a>
          </Link>
          <Link prefetch={false} href="/hydro/sma">
            <a className={router.query.slug === 'sma' ? 'active' : ''}>sma</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-1">
            <a className={router.query.slug === 'spei-1' ? 'active' : ''}>spei-1</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-3">
            <a className={router.query.slug === 'spei-3' ? 'active' : ''}>spei-3</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-6">
            <a className={router.query.slug === 'spei-6' ? 'active' : ''}>spei-6</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-12">
            <a className={router.query.slug === 'spei-12' ? 'active' : ''}>spei-12</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-1">
            <a className={router.query.slug === 'spi-1' ? 'active' : ''}>spi-1</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-3">
            <a className={router.query.slug === 'spi-3' ? 'active' : ''}>spi-3</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-6">
            <a className={router.query.slug === 'spi-6' ? 'active' : ''}>spi-6</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-12">
            <a className={router.query.slug === 'spi-12' ? 'active' : ''}>spi-12</a>
          </Link>
        </div>
      </div>


    </Layout >
  );
}
